require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { parseReplay } = require("../lib/parse");
const { fetchParticipationReplay } = require("../lib/sapPlayback");

function parseArgs(argv) {
  const options = {
    version: "45",
    recentHours: null,
    allVersions: false
  };

  for (const arg of argv) {
    if (arg === "--all-versions") {
      options.allVersions = true;
      continue;
    }

    if (arg.startsWith("--version=")) {
      const value = arg.slice("--version=".length).trim();
      options.version = value || null;
      continue;
    }

    if (arg.startsWith("--recent-hours=")) {
      const value = Number(arg.slice("--recent-hours=".length));
      if (Number.isFinite(value) && value > 0) {
        options.recentHours = Math.floor(value);
      }
    }
  }

  if (options.allVersions) {
    options.version = null;
  }

  return options;
}

function isFiniteRank(value) {
  return Number.isFinite(value) ? value : null;
}

function pickBestRankPair(primaryPlayerRank, primaryOpponentRank, mirroredPlayerRank, mirroredOpponentRank) {
  const primaryDistinct =
    primaryPlayerRank !== null &&
    primaryOpponentRank !== null &&
    primaryPlayerRank !== primaryOpponentRank;
  const mirroredDistinct =
    mirroredPlayerRank !== null &&
    mirroredOpponentRank !== null &&
    mirroredPlayerRank !== mirroredOpponentRank;

  if (!primaryDistinct && mirroredDistinct) {
    return {
      playerRank: mirroredPlayerRank,
      opponentRank: mirroredOpponentRank
    };
  }

  if (primaryDistinct && !mirroredDistinct) {
    return {
      playerRank: primaryPlayerRank,
      opponentRank: primaryOpponentRank
    };
  }

  return {
    playerRank: primaryPlayerRank ?? mirroredPlayerRank,
    opponentRank: primaryOpponentRank ?? mirroredOpponentRank
  };
}

async function resolveReplayRanks(primaryParticipationId) {
  const primaryRaw = await fetchParticipationReplay(primaryParticipationId);
  const primaryParsed = parseReplay(primaryRaw);

  let playerId = primaryParsed.playerId || null;
  let opponentId = primaryParsed.opponentId || null;
  let opponentParticipationId = primaryParsed.opponentParticipationId || null;
  const primaryPlayerRank = isFiniteRank(primaryParsed.playerRank);
  const primaryOpponentRank = isFiniteRank(primaryParsed.opponentRank);
  let playerRank = primaryPlayerRank;
  let opponentRank = primaryOpponentRank;

  if (opponentParticipationId && opponentParticipationId !== primaryParticipationId) {
    try {
      const opponentRaw = await fetchParticipationReplay(opponentParticipationId);
      const opponentParsed = parseReplay(opponentRaw);
      opponentId = opponentParsed.playerId || opponentId;
      const opponentSidePlayerRank = isFiniteRank(opponentParsed.playerRank);
      const opponentSideOpponentRank = isFiniteRank(opponentParsed.opponentRank);
      const selected = pickBestRankPair(
        primaryPlayerRank,
        primaryOpponentRank,
        opponentSideOpponentRank,
        opponentSidePlayerRank
      );
      playerRank = selected.playerRank;
      opponentRank = selected.opponentRank;
      if (!playerId && opponentParsed.opponentId) {
        playerId = opponentParsed.opponentId;
      }
    } catch (error) {
      console.warn("Opponent replay fetch failed while backfilling rank", {
        participationId: primaryParticipationId,
        opponentParticipationId,
        error: error?.message || "failed"
      });
    }
  }

  return {
    raw: primaryRaw,
    parsed: primaryParsed,
    playerId,
    opponentId,
    opponentParticipationId,
    playerRank,
    opponentRank
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const whereClauses = [];
    const whereValues = [];

    if (options.version) {
      whereValues.push(options.version);
      whereClauses.push(`game_version = $${whereValues.length}`);
    }

    if (options.recentHours !== null) {
      whereValues.push(options.recentHours);
      whereClauses.push(`created_at >= now() - ($${whereValues.length}::int * interval '1 hour')`);
    }

    const whereSql = whereClauses.length ? `where ${whereClauses.join(" and ")}` : "";
    const { rows } = await client.query(
      `select id, participation_id
       from replays
       ${whereSql}
       order by created_at asc`,
      whereValues
    );

    console.log(
      `Replays found: ${rows.length} (version=${options.version ?? "all"}, recentHours=${options.recentHours ?? "all"})`
    );

    let updated = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const enriched = await resolveReplayRanks(row.participation_id);
        await client.query(
          `update replays
           set
             player_id = $1,
             opponent_id = $2,
             opponent_participation_id = $3,
             player_rank = $4,
             opponent_rank = $5,
             game_version = coalesce($6, game_version),
             raw_json = $7
           where id = $8`,
          [
            enriched.playerId,
            enriched.opponentId,
            enriched.opponentParticipationId,
            enriched.playerRank,
            enriched.opponentRank,
            enriched.parsed.gameVersion || options.version || null,
            enriched.raw,
            row.id
          ]
        );
        updated += 1;
      } catch (error) {
        failed += 1;
        console.error("Rank backfill failed", {
          replayId: row.id,
          participationId: row.participation_id,
          error: error?.message || "failed"
        });
      }
    }

    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
