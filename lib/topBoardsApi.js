const { ensureTopBoardsSchema } = require("./topBoardsJob");

function parsePositiveInt(value, fallback, min = 1, max = 1000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function parseJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function resolveVersion(pool, value) {
  const normalized = String(value || "current").trim().toLowerCase();
  if (!normalized || normalized === "all") return null;
  if (normalized !== "current") return value;
  const { rows } = await pool.query(
    `
      select game_version
      from replays
      where game_version is not null and game_version <> ''
      order by created_at desc
      limit 1
    `
  );
  return rows[0]?.game_version || null;
}

function normalizeSide(value) {
  const side = String(value || "both").trim().toLowerCase();
  if (side === "player" || side === "opponent") return side;
  return "both";
}

function normalizeMatchType(value) {
  const type = String(value || "ranked").trim().toLowerCase();
  if (!type || type === "any") return null;
  return type;
}

function sideFilterArray(side) {
  if (side === "both") return ["player", "opponent"];
  return [side];
}

async function getRunById(pool, runId) {
  await ensureTopBoardsSchema(pool);
  const { rows } = await pool.query(
    `
      select
        id,
        config_name,
        status,
        created_by,
        dataset_version,
        dataset_match_types,
        dataset_sides,
        dataset_limit,
        config,
        stats,
        error,
        started_at,
        finished_at,
        created_at
      from board_rank_runs
      where id = $1
      limit 1
    `,
    [runId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    configName: row.config_name,
    status: row.status,
    createdBy: row.created_by,
    datasetVersion: row.dataset_version,
    datasetMatchTypes: row.dataset_match_types || [],
    datasetSides: row.dataset_sides || [],
    datasetLimit: Number(row.dataset_limit || 0),
    config: parseJsonObject(row.config, {}),
    stats: parseJsonObject(row.stats, {}),
    error: row.error || null,
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    createdAt: row.created_at || null
  };
}

async function getLatestRunForScope(pool, scope = {}) {
  await ensureTopBoardsSchema(pool);
  const version = await resolveVersion(pool, scope.version);
  const matchType = normalizeMatchType(scope.matchType);
  const side = normalizeSide(scope.side);

  const { rows } = await pool.query(
    `
      select
        id,
        config_name,
        status,
        dataset_version,
        dataset_match_types,
        dataset_sides,
        dataset_limit,
        stats,
        started_at,
        finished_at,
        created_at
      from board_rank_runs
      where status = 'complete'
        and ($1::text is null or dataset_version = $1::text)
        and ($2::text is null or dataset_match_types @> array[$2::text])
        and ($3::text[] is null or dataset_sides @> $3::text[])
      order by finished_at desc nulls last, created_at desc
      limit 1
    `,
    [
      version,
      matchType,
      side === "both" ? ["player", "opponent"] : [side]
    ]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    configName: row.config_name,
    status: row.status,
    datasetVersion: row.dataset_version,
    datasetMatchTypes: row.dataset_match_types || [],
    datasetSides: row.dataset_sides || [],
    datasetLimit: Number(row.dataset_limit || 0),
    stats: parseJsonObject(row.stats, {}),
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    createdAt: row.created_at || null
  };
}

function rowToTopItem(row) {
  const boardState = parseJsonObject(row.board_state, {});
  const sourceSide = String(row.source_side || "").toLowerCase();
  const playerName = sourceSide === "opponent" ? row.opponent_name : row.player_name;
  const normalizedPlayerName = playerName ? String(playerName).trim() : "";
  return {
    rank: Number(row.rank || 0),
    boardId: row.board_id,
    replayId: row.source_replay_id,
    turnNumber: Number(row.source_turn_number || 0),
    playerName: normalizedPlayerName || sourceSide || null,
    pack: row.board_pack || null,
    rating: Number(row.rating || 0),
    winRate: Number(row.win_rate || 0),
    wins: Number(row.wins || 0),
    losses: Number(row.losses || 0),
    draws: Number(row.draws || 0),
    matches: Number(row.matches || 0),
    strengthOfSchedule: Number(row.strength_of_schedule || 0),
    preview: {
      toy: {
        name: boardState?.toyName || null,
        level: Number(boardState?.toyLevel || 1)
      },
      pets: Array.isArray(boardState?.pets)
        ? boardState.pets
          .map((pet, idx) => {
            if (!pet || !pet.name) return null;
            return {
              slot: idx + 1,
              name: pet.name,
              attack: Number(pet.attack || 0),
              health: Number(pet.health || 0),
              level: Number(pet.exp || 0) >= 5 ? 3 : Number(pet.exp || 0) >= 2 ? 2 : 1,
              perk: pet.equipment || null
            };
          })
          .filter(Boolean)
        : []
    }
  };
}

async function getTopItems(pool, runId, options = {}) {
  await ensureTopBoardsSchema(pool);
  const side = normalizeSide(options.side);
  const limit = parsePositiveInt(options.limit, 100, 1, 100);
  const pack = options.pack ? String(options.pack).trim() : null;

  const { rows } = await pool.query(
    `
      select
        r.rank,
        r.board_id,
        b.source_replay_id,
        b.source_turn_number,
        b.source_side,
        replay.player_name,
        replay.opponent_name,
        b.board_pack,
        r.rating,
        r.win_rate,
        r.wins,
        r.losses,
        r.draws,
        r.matches,
        r.strength_of_schedule,
        b.board_state
      from board_rank_results r
      join board_rank_boards b
        on b.id = r.board_id
       and b.run_id = r.run_id
      left join replays replay
        on replay.id = b.source_replay_id
      where r.run_id = $1
        and ($2::text is null or b.board_pack = $2::text)
        and ($3::text = 'both' or b.source_side = $3::text)
      order by r.rank asc
      limit $4
    `,
    [runId, pack, side, limit]
  );

  return rows.map(rowToTopItem);
}

async function getBoardDetail(pool, runId, boardId, options = {}) {
  await ensureTopBoardsSchema(pool);
  const { rows } = await pool.query(
    `
      select
        r.rank,
        r.board_id,
        r.rating,
        r.win_rate,
        r.wins,
        r.losses,
        r.draws,
        r.matches,
        r.strength_of_schedule,
        b.source_replay_id,
        b.source_turn_number,
        b.source_side,
        replay.player_name,
        replay.opponent_name,
        b.board_pack,
        b.board_state
      from board_rank_results r
      join board_rank_boards b
        on b.id = r.board_id
       and b.run_id = r.run_id
      left join replays replay
        on replay.id = b.source_replay_id
      where r.run_id = $1
        and r.board_id = $2
      limit 1
    `,
    [runId, boardId]
  );
  if (!rows.length) return null;
  const board = rowToTopItem(rows[0]);
  board.state = parseJsonObject(rows[0].board_state, {});

  const matchupRows = await pool.query(
    `
      select
        p.board_a_id,
        p.board_b_id,
        p.board_a_wins,
        p.board_b_wins,
        p.draws,
        p.simulation_count
      from board_rank_pairings p
      where p.run_id = $1
        and p.stage = 'final'
        and ($2::uuid in (p.board_a_id, p.board_b_id))
    `,
    [runId, boardId]
  );

  const opponents = matchupRows.rows.map((row) => {
    const isA = row.board_a_id === boardId;
    return {
      opponentBoardId: isA ? row.board_b_id : row.board_a_id,
      wins: Number(isA ? row.board_a_wins : row.board_b_wins),
      losses: Number(isA ? row.board_b_wins : row.board_a_wins),
      draws: Number(row.draws || 0),
      simulationCount: Number(row.simulation_count || 0)
    };
  });

  const opponentIds = opponents.map((row) => row.opponentBoardId);
  let opponentMap = new Map();
  if (opponentIds.length) {
    const { rows: opponentRows } = await pool.query(
      `
        select
          r.board_id,
          r.rank,
          r.win_rate,
          b.board_pack,
          b.source_side
        from board_rank_results r
        join board_rank_boards b
          on b.id = r.board_id
         and b.run_id = r.run_id
        where r.run_id = $1
          and r.board_id = any($2::uuid[])
      `,
      [runId, opponentIds]
    );
    opponentMap = new Map(
      opponentRows.map((row) => [
        row.board_id,
        {
          rank: Number(row.rank || 0),
          winRate: Number(row.win_rate || 0),
          pack: row.board_pack || null,
          side: row.source_side || null
        }
      ])
    );
  }

  const matchups = opponents.map((row) => {
    const total = row.wins + row.losses + row.draws;
    const winRate = total > 0 ? (row.wins + row.draws * 0.5) / total : 0;
    const opponent = opponentMap.get(row.opponentBoardId) || {};
    return {
      ...row,
      opponentRank: Number(opponent.rank || 0),
      opponentPack: opponent.pack || null,
      opponentSide: opponent.side || null,
      opponentWinRate: Number(opponent.winRate || 0),
      winRate
    };
  });

  const sort = String(options.sort || "opponentRank");
  const order = String(options.order || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const direction = order === "desc" ? -1 : 1;
  matchups.sort((a, b) => {
    if (sort === "wins") return direction * (a.wins - b.wins);
    if (sort === "losses") return direction * (a.losses - b.losses);
    if (sort === "draws") return direction * (a.draws - b.draws);
    if (sort === "winRate") return direction * (a.winRate - b.winRate);
    return direction * (a.opponentRank - b.opponentRank);
  });

  const limit = parsePositiveInt(options.limit, 100, 1, 200);
  return {
    board,
    matchups: matchups.slice(0, limit)
  };
}

module.exports = {
  parsePositiveInt,
  parseJsonObject,
  resolveVersion,
  normalizeSide,
  normalizeMatchType,
  sideFilterArray,
  getRunById,
  getLatestRunForScope,
  getTopItems,
  getBoardDetail
};
