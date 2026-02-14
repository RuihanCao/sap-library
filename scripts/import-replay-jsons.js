const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const { parseReplay } = require("../lib/parse");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function usage() {
  console.log("Usage: node scripts/import-replay-jsons.js <directory-with-json-files> [concurrency]");
}

function collectJsonFiles(rootDir) {
  const out = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        out.push(full);
      }
    }
  }

  return out;
}

function extractReplayObjects(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(extractReplayObjects);
  }
  if (typeof value !== "object") return [];

  if (Array.isArray(value.Actions)) {
    return [value];
  }

  const nestedKeys = ["Replay", "replay", "Raw", "raw", "Playback", "playback", "data"];
  const nested = [];
  for (const key of nestedKeys) {
    if (value[key] !== undefined) {
      nested.push(...extractReplayObjects(value[key]));
    }
  }
  return nested;
}

async function readReplayObjects(filePath) {
  const text = await fs.promises.readFile(filePath, "utf8");
  if (!text.trim()) return [];

  try {
    const parsed = JSON.parse(text);
    return extractReplayObjects(parsed);
  } catch {
    // fallback for NDJSON-like files
    const rows = [];
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        rows.push(...extractReplayObjects(parsed));
      } catch {
        // ignore malformed lines
      }
    }
    return rows;
  }
}

function extractParticipationId(raw, filePath, indexInFile) {
  const candidates = [
    raw?.Pid,
    raw?.pid,
    raw?.ParticipationId,
    raw?.participationId,
    raw?.ParticipationID,
    raw?.participation_id,
    raw?.Participation?.Id,
    raw?.Participation?.ParticipationId
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = String(candidate).match(UUID_REGEX);
    if (match) return match[0];
  }

  const fileMatch = path.basename(filePath).match(UUID_REGEX);
  if (fileMatch) return fileMatch[0];

  // Stable synthetic key for files with no PID field.
  const hash = crypto
    .createHash("sha1")
    .update(filePath)
    .update(":")
    .update(String(indexInFile))
    .update(":")
    .update(JSON.stringify(raw))
    .digest("hex");

  return `file:${hash}`;
}

async function ingestReplay(client, raw, filePath, indexInFile) {
  const participationId = extractParticipationId(raw, filePath, indexInFile);
  const parsed = parseReplay(raw);
  const normalizedMatchId =
    (parsed.matchType || "").toLowerCase() === "arena" ? null : parsed.matchId;

  await client.query("begin");
  try {
    const replayRes = await client.query(
      `insert into replays (
         participation_id,
         match_id,
         player_name,
         opponent_name,
         pack,
         opponent_pack,
         game_version,
         max_lives,
         mode,
         match_type,
         match_name,
         match_pack,
         max_player_count,
         active_player_count,
         spectator_mode,
         raw_json
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       on conflict do nothing
       returning id`,
      [
        participationId,
        normalizedMatchId,
        parsed.playerName,
        parsed.opponentName,
        parsed.packName,
        parsed.opponentPackName,
        parsed.gameVersion,
        parsed.maxLives,
        parsed.mode,
        parsed.matchType,
        parsed.matchName,
        parsed.matchPack,
        parsed.maxPlayerCount,
        parsed.activePlayerCount,
        parsed.spectatorMode,
        raw
      ]
    );

    const replayId = replayRes.rows[0]?.id;
    if (!replayId) {
      await client.query("rollback");
      const byPid = await client.query(
        "select id from replays where participation_id = $1 limit 1",
        [participationId]
      );
      if (byPid.rowCount) return { status: "skipped_participation" };

      if (normalizedMatchId) {
        const byMatch = await client.query(
          "select id from replays where match_id = $1 limit 1",
          [normalizedMatchId]
        );
        if (byMatch.rowCount) return { status: "skipped_match" };
      }
      return { status: "skipped_conflict" };
    }

    if (parsed.turns.length) {
      const turnValues = [];
      const turnRows = [];
      for (const t of parsed.turns) {
        turnRows.push([
          replayId,
          t.turn_number,
          t.outcome,
          t.opponent_name,
          t.player_lives,
          t.player_gold_spent,
          t.opponent_gold_spent,
          t.player_rolls,
          t.opponent_rolls,
          t.player_summons,
          t.opponent_summons
        ]);
      }

      const turnSqlValues = [];
      let idx = 1;
      for (const row of turnRows) {
        const placeholders = row.map(() => `$${idx++}`);
        turnSqlValues.push(`(${placeholders.join(", ")})`);
        turnValues.push(...row);
      }

      await client.query(
        `insert into turns (
          replay_id,
          turn_number,
          outcome,
          opponent_name,
          player_lives,
          player_gold_spent,
          opponent_gold_spent,
          player_rolls,
          opponent_rolls,
          player_summons,
          opponent_summons
        ) values ${turnSqlValues.join(", ")}`,
        turnValues
      );
    }

    if (parsed.pets.length) {
      const petValues = [];
      const petRows = [];
      for (const p of parsed.pets) {
        petRows.push([
          replayId,
          p.turn_number,
          p.side,
          p.position,
          p.pet_name,
          p.level,
          p.attack,
          p.health,
          p.perk,
          p.toy
        ]);
      }

      const petSqlValues = [];
      let idx = 1;
      for (const row of petRows) {
        const placeholders = row.map(() => `$${idx++}`);
        petSqlValues.push(`(${placeholders.join(", ")})`);
        petValues.push(...row);
      }

      await client.query(
        `insert into pets (
          replay_id,
          turn_number,
          side,
          position,
          pet_name,
          level,
          attack,
          health,
          perk,
          toy
        ) values ${petSqlValues.join(", ")}`,
        petValues
      );
    }

    await client.query("commit");
    return { status: "inserted" };
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

function parseConcurrency(rawValue) {
  const fallback = Math.max(2, Math.min(8, Math.floor((os.cpus()?.length || 4) / 2)));
  if (!rawValue) return fallback;
  const n = Number(rawValue);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(32, Math.floor(n));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function main() {
  const inputDir = process.argv[2];
  const concurrency = parseConcurrency(process.argv[3]);
  if (!inputDir) {
    usage();
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const rootDir = path.resolve(inputDir);
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`Directory not found: ${rootDir}`);
    process.exit(1);
  }

  const files = collectJsonFiles(rootDir);
  if (!files.length) {
    console.log(`No .json files found under: ${rootDir}`);
    return;
  }

  console.log(`Found ${files.length} JSON files under ${rootDir}`);
  console.log(`Using concurrency=${concurrency}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: concurrency + 2
  });

  let fileCount = 0;
  let candidateCount = 0;
  let inserted = 0;
  let skippedParticipation = 0;
  let skippedMatch = 0;
  let skippedConflict = 0;
  let failed = 0;
  let nextFileIndex = 0;
  const failures = [];
  const startedAt = Date.now();

  const progressTimer = setInterval(() => {
    const elapsedMs = Date.now() - startedAt;
    const filesPerSec = fileCount > 0 ? fileCount / (elapsedMs / 1000) : 0;
    const remainingFiles = Math.max(0, files.length - fileCount);
    const etaMs = filesPerSec > 0 ? (remainingFiles / filesPerSec) * 1000 : null;

    const parts = [
      `[${new Date().toLocaleTimeString()}]`,
      `files ${fileCount}/${files.length}`,
      `payloads ${candidateCount}`,
      `inserted ${inserted}`,
      `skipped ${skippedParticipation + skippedMatch + skippedConflict}`,
      `failed ${failed}`,
      `elapsed ${formatDuration(elapsedMs)}`
    ];
    if (etaMs !== null) parts.push(`eta ${formatDuration(etaMs)}`);
    console.log(parts.join(" | "));
  }, 15000);

  async function worker() {
    const client = await pool.connect();
    try {
      while (true) {
        const myIndex = nextFileIndex;
        nextFileIndex += 1;
        if (myIndex >= files.length) break;

        const filePath = files[myIndex];
        let replays = [];
        try {
          replays = await readReplayObjects(filePath);
        } catch (err) {
          failed += 1;
          failures.push({
            file: filePath,
            indexInFile: -1,
            error: `read/parse failed: ${err.message || "failed"}`
          });
          fileCount += 1;
          continue;
        }

        for (let i = 0; i < replays.length; i += 1) {
          const raw = replays[i];
          candidateCount += 1;
          try {
            const result = await ingestReplay(client, raw, filePath, i);
            if (result.status === "inserted") inserted += 1;
            else if (result.status === "skipped_participation") skippedParticipation += 1;
            else if (result.status === "skipped_match") skippedMatch += 1;
            else skippedConflict += 1;
          } catch (err) {
            failed += 1;
            failures.push({
              file: filePath,
              indexInFile: i,
              error: err.message || "failed"
            });
          }
        }
        fileCount += 1;
      }
    } finally {
      client.release();
    }
  }

  try {
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
  } finally {
    clearInterval(progressTimer);
    await pool.end();
  }

  const elapsedMs = Date.now() - startedAt;
  console.log("");
  console.log("Import summary:");
  console.log(`  Elapsed:               ${formatDuration(elapsedMs)}`);
  console.log(`  Files scanned:         ${fileCount}`);
  console.log(`  Replay payloads found: ${candidateCount}`);
  console.log(`  Inserted:              ${inserted}`);
  console.log(`  Skipped (PID):         ${skippedParticipation}`);
  console.log(`  Skipped (match):       ${skippedMatch}`);
  console.log(`  Skipped (conflict):    ${skippedConflict}`);
  console.log(`  Failed:                ${failed}`);

  if (failures.length) {
    console.log("");
    console.log("First failures:");
    for (const row of failures.slice(0, 10)) {
      console.log(`  - ${row.file} [${row.indexInFile}]: ${row.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
