require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const {
  extractHistoryParticipationIds,
  fetchTeamwoodHistory,
  normalizeHistoryResponse
} = require("../lib/teamwoodHistory");
const {
  appendReplayTags,
  ingestParticipationReplay,
  normalizeTags
} = require("../services/discord-bot/replay-ingest");

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: null,
    limit: null,
    tags: ["source:history", "history-sync"]
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--file") {
      args.file = argv[i + 1] || null;
      i += 1;
    } else if (arg.startsWith("--file=")) {
      args.file = arg.slice("--file=".length);
    } else if (arg === "--limit") {
      args.limit = Number.parseInt(argv[i + 1] || "", 10);
      i += 1;
    } else if (arg.startsWith("--limit=")) {
      args.limit = Number.parseInt(arg.slice("--limit=".length), 10);
    } else if (arg === "--tag") {
      args.tags.push(argv[i + 1] || "");
      i += 1;
    } else if (arg.startsWith("--tag=")) {
      args.tags.push(arg.slice("--tag=".length));
    }
  }

  if (!Number.isFinite(args.limit) || args.limit <= 0) {
    args.limit = null;
  }
  args.tags = normalizeTags(args.tags);
  return args;
}

function readHistoryFile(filePath) {
  const resolved = path.resolve(filePath);
  const json = JSON.parse(fs.readFileSync(resolved, "utf8"));
  return {
    apiVersion: json?.Version || null,
    history: normalizeHistoryResponse(json),
    source: resolved
  };
}

async function loadHistory(args) {
  if (args.file) {
    return readHistoryFile(args.file);
  }
  const fetched = await fetchTeamwoodHistory();
  return {
    ...fetched,
    source: `teamwood:v${fetched.apiVersion}`
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadHistory(args);
  let participationIds = extractHistoryParticipationIds(loaded.history);
  if (args.limit) {
    participationIds = participationIds.slice(0, args.limit);
  }

  const summary = {
    source: loaded.source,
    historyRows: loaded.history.History.length,
    hallFameRows: loaded.history.HallFame.length,
    foundParticipationIds: participationIds.length,
    inserted: 0,
    existsParticipation: 0,
    existsMatch: 0,
    invalid: 0,
    failed: 0,
    tagged: 0,
    failedEntries: []
  };

  console.log("History sync source", {
    source: summary.source,
    historyRows: summary.historyRows,
    hallFameRows: summary.hallFameRows,
    foundParticipationIds: summary.foundParticipationIds,
    dryRun: args.dryRun,
    tags: args.tags
  });

  if (args.dryRun) {
    console.log("Dry run participation IDs", participationIds);
    return;
  }

  for (const participationId of participationIds) {
    try {
      const result = await ingestParticipationReplay(participationId);
      if (result.status === "inserted") summary.inserted += 1;
      else if (result.status === "exists_participation") summary.existsParticipation += 1;
      else if (result.status === "exists_match") summary.existsMatch += 1;
      else if (result.status === "invalid_participation_id") summary.invalid += 1;

      if (result.replayId && args.tags.length) {
        const tagResult = await appendReplayTags(result.replayId, args.tags, {
          participationId: result.participationId,
          matchId: result.matchId
        });
        if (tagResult.updated) summary.tagged += 1;
      }

      console.log("History replay sync", {
        participationId,
        status: result.status,
        replayId: result.replayId || null
      });
    } catch (error) {
      summary.failed += 1;
      summary.failedEntries.push({
        participationId,
        reason: error?.message || "failed"
      });
      console.error("History replay sync failed", {
        participationId,
        error: error?.message || error
      });
    }
  }

  console.log("History sync complete", summary);
}

main()
  .catch((error) => {
    console.error("History sync failed", error?.stack || error);
    process.exitCode = 1;
  })
  .finally(() => {
    // The ingest helper owns a pg Pool, so let the CLI process exit after work completes.
    setTimeout(() => process.exit(process.exitCode || 0), 100);
  });
