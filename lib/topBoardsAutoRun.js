const {
  ensureTopBoardsSchema,
  startTopBoardsRun,
  DEFAULT_CONFIG_NAME
} = require("./topBoardsJob");

const DEFAULT_THRESHOLD = 2000;
const DEFAULT_COOLDOWN_HOURS = 12;
const DEFAULT_STALE_RUN_HOURS = 24;
const AUTORUN_LOCK_KEY = 9_713_263;
const SUPPORTED_MATCH_TYPES = new Set(["ranked", "private", "arena"]);
const DEFAULT_CONFIG_BY_MATCH_TYPE = {
  ranked: DEFAULT_CONFIG_NAME,
  private: "top-boards.private",
  arena: "top-boards.arena"
};

const globalState = globalThis;
if (!globalState.__sapTopBoardsAutoRunQueue) {
  globalState.__sapTopBoardsAutoRunQueue = Promise.resolve();
}

function toPositiveInt(value, fallback, min = 1, max = 1_000_000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeMatchType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!SUPPORTED_MATCH_TYPES.has(type)) return null;
  return type;
}

function scopeKeyForMatchType(matchType) {
  return `matchType=${matchType}`;
}

function resolveConfigName(matchType) {
  const envKey = `TOP_BOARDS_AUTORUN_CONFIG_${String(matchType || "").toUpperCase()}`;
  const specific = process.env[envKey];
  const globalConfig = process.env.TOP_BOARDS_AUTORUN_CONFIG;
  const fallback = DEFAULT_CONFIG_BY_MATCH_TYPE[matchType] || DEFAULT_CONFIG_NAME;
  return String(specific || globalConfig || fallback).trim() || DEFAULT_CONFIG_NAME;
}

function getPolicy(matchType) {
  const enabled = String(process.env.TOP_BOARDS_AUTORUN_ENABLED || "true").toLowerCase() !== "false";
  const threshold = toPositiveInt(
    process.env.TOP_BOARDS_AUTORUN_THRESHOLD,
    DEFAULT_THRESHOLD,
    1,
    1_000_000
  );
  const cooldownHours = toPositiveInt(
    process.env.TOP_BOARDS_AUTORUN_COOLDOWN_HOURS,
    DEFAULT_COOLDOWN_HOURS,
    1,
    24 * 30
  );
  const staleRunHours = toPositiveInt(
    process.env.TOP_BOARDS_AUTORUN_STALE_RUN_HOURS,
    DEFAULT_STALE_RUN_HOURS,
    1,
    24 * 30
  );
  const configName = resolveConfigName(matchType);
  return {
    enabled,
    matchType,
    scopeKey: scopeKeyForMatchType(matchType),
    threshold,
    cooldownHours,
    cooldownMs: cooldownHours * 60 * 60 * 1000,
    staleRunHours,
    staleRunMs: staleRunHours * 60 * 60 * 1000,
    configName
  };
}

function enqueueAutoRun(task) {
  const current = globalState.__sapTopBoardsAutoRunQueue;
  const next = current.then(task, task);
  globalState.__sapTopBoardsAutoRunQueue = next.catch(() => {});
  return next;
}

async function bumpPendingReplayCounter(db, scopeKey, incrementBy, replayCreatedAt) {
  const safeIncrement = toPositiveInt(incrementBy, 1, 1, 100_000);
  const replayTs = replayCreatedAt ? new Date(replayCreatedAt).toISOString() : new Date().toISOString();
  const { rows } = await db.query(
    `
      insert into board_rank_autorun_state (
        scope_key,
        pending_replays,
        last_replay_created_at,
        updated_at
      )
      values ($1, $2, $3::timestamptz, now())
      on conflict (scope_key)
      do update set
        pending_replays = board_rank_autorun_state.pending_replays + excluded.pending_replays,
        last_replay_created_at = coalesce(
          greatest(board_rank_autorun_state.last_replay_created_at, excluded.last_replay_created_at),
          board_rank_autorun_state.last_replay_created_at,
          excluded.last_replay_created_at
        ),
        updated_at = now()
      returning pending_replays, last_replay_created_at
    `,
    [scopeKey, safeIncrement, replayTs]
  );
  return {
    pendingReplays: Number(rows[0]?.pending_replays || 0),
    lastReplayCreatedAt: rows[0]?.last_replay_created_at || null
  };
}

async function getLatestRun(db, matchType) {
  const { rows } = await db.query(
    `
      select id, status, created_at
      from board_rank_runs
      where dataset_match_types @> array[$1::text]
      order by created_at desc
      limit 1
    `,
    [matchType]
  );
  return rows[0] || null;
}

async function getActiveRun(db) {
  const { rows } = await db.query(
    `
      select id, status, created_at, started_at
      from board_rank_runs
      where status in ('queued', 'running')
      order by created_at desc
      limit 1
    `
  );
  return rows[0] || null;
}

function getRunAgeMs(run) {
  const ts = run?.started_at || run?.created_at;
  const parsed = ts ? new Date(ts).getTime() : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Date.now() - parsed);
}

async function failStaleActiveRun(db, runId, reason) {
  if (!runId) return false;
  const { rowCount } = await db.query(
    `
      update board_rank_runs
      set
        status = 'failed',
        error = coalesce(nullif(error, ''), $2),
        finished_at = coalesce(finished_at, now())
      where id = $1
        and status in ('queued', 'running')
    `,
    [runId, reason || "marked stale by autorun"]
  );
  return rowCount > 0;
}

async function resetPendingCounterAfterStart(db, scopeKey, runId) {
  await db.query(
    `
      update board_rank_autorun_state
      set
        pending_replays = 0,
        last_triggered_run_id = $2,
        updated_at = now()
      where scope_key = $1
    `,
    [scopeKey, runId]
  );
}

async function withAutoRunLock(db, fn) {
  const { rows } = await db.query("select pg_try_advisory_lock($1::bigint) as locked", [AUTORUN_LOCK_KEY]);
  if (!rows[0]?.locked) {
    return { locked: false };
  }
  try {
    const result = await fn();
    return { locked: true, ...result };
  } finally {
    await db.query("select pg_advisory_unlock($1::bigint)", [AUTORUN_LOCK_KEY]);
  }
}

async function getPendingState(db, scopeKey) {
  const { rows } = await db.query(
    `
      select pending_replays, last_replay_created_at, updated_at
      from board_rank_autorun_state
      where scope_key = $1
      limit 1
    `,
    [scopeKey]
  );
  return {
    pendingReplays: Number(rows[0]?.pending_replays || 0),
    lastReplayCreatedAt: rows[0]?.last_replay_created_at || null,
    updatedAt: rows[0]?.updated_at || null
  };
}

async function evaluateAndMaybeStart({
  db,
  source = "unknown",
  matchType,
  incrementBy = 1,
  replayCreatedAt = null,
  logger = console
}) {
  const normalizedMatchType = normalizeMatchType(matchType);
  if (!normalizedMatchType) {
    return {
      triggered: false,
      reason: "unsupported_match_type",
      matchType: matchType || null
    };
  }

  const policy = getPolicy(normalizedMatchType);
  if (!policy.enabled) {
    return { triggered: false, reason: "disabled", policy };
  }

  await bumpPendingReplayCounter(db, policy.scopeKey, incrementBy, replayCreatedAt);
  const locked = await withAutoRunLock(db, async () => {
    const state = await getPendingState(db, policy.scopeKey);
    let activeRun = await getActiveRun(db);
    if (activeRun) {
      const activeRunAgeMs = getRunAgeMs(activeRun);
      if (activeRunAgeMs >= policy.staleRunMs) {
        const staleReason = `marked stale by autorun after ${policy.staleRunHours}h at ${new Date().toISOString()}`;
        const failedStale = await failStaleActiveRun(db, activeRun.id, staleReason);
        if (failedStale && logger && typeof logger.warn === "function") {
          logger.warn("Top boards autorun failed stale active run", {
            runId: activeRun.id,
            status: activeRun.status,
            activeRunAgeMs
          });
        }
        activeRun = await getActiveRun(db);
      }
    }

    if (activeRun) {
      return {
        triggered: false,
        reason: "run_in_progress",
        pendingReplays: state.pendingReplays,
        activeRunId: activeRun.id,
        activeRunStatus: activeRun.status,
        policy
      };
    }

    const latestRun = await getLatestRun(db, normalizedMatchType);
    if (latestRun?.created_at) {
      const ageMs = Date.now() - new Date(latestRun.created_at).getTime();
      if (ageMs < policy.cooldownMs) {
        return {
          triggered: false,
          reason: "cooldown",
          pendingReplays: state.pendingReplays,
          cooldownRemainingMs: Math.max(0, policy.cooldownMs - ageMs),
          policy
        };
      }
    }

    if (state.pendingReplays < policy.threshold) {
      return {
        triggered: false,
        reason: "below_threshold",
        pendingReplays: state.pendingReplays,
        policy
      };
    }

    try {
      const started = await startTopBoardsRun({
        db,
        configName: policy.configName,
        createdBy: `autorun:${source}:${normalizedMatchType}`,
        logger,
        sync: false,
        force: false
      });
      await resetPendingCounterAfterStart(db, policy.scopeKey, started.runId);
      return {
        triggered: true,
        reason: "started",
        runId: started.runId,
        pendingReplays: state.pendingReplays,
        policy
      };
    } catch (error) {
      if (error?.code === "RUN_IN_PROGRESS") {
        return {
          triggered: false,
          reason: "run_in_progress",
          pendingReplays: state.pendingReplays,
          activeRunId: error.runId || null,
          policy
        };
      }
      throw error;
    }
  });

  if (!locked.locked) {
    const state = await getPendingState(db, policy.scopeKey);
    return {
      triggered: false,
      reason: "lock_unavailable",
      pendingReplays: state.pendingReplays,
      policy
    };
  }
  return {
    triggered: Boolean(locked.triggered),
    ...locked
  };
}

async function registerReplayInsertAndMaybeStartTopBoards({
  db,
  source = "unknown",
  matchType = null,
  incrementBy = 1,
  replayCreatedAt = null,
  logger = console
}) {
  if (!db) {
    return { triggered: false, reason: "no_db" };
  }
  const amount = toPositiveInt(incrementBy, 1, 1, 100_000);
  await ensureTopBoardsSchema(db);
  return enqueueAutoRun(() =>
    evaluateAndMaybeStart({
      db,
      source,
      matchType,
      incrementBy: amount,
      replayCreatedAt,
      logger
    })
  );
}

module.exports = {
  registerReplayInsertAndMaybeStartTopBoards
};
