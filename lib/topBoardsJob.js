const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parseReplayForCalculator } = require("./calculator");

const DEFAULT_CONFIG_NAME = "top-boards.default";
const DEFAULT_CONFIG_FILE = "top-boards.default.json";
const DEFAULT_EXCLUDED_PACKS = ["Custom", "Weekly"];
const DEFAULT_MATCH_TYPES = ["ranked"];
const DEFAULT_SIDES = ["player", "opponent"];

const globalState = globalThis;
if (!globalState.__sapTopBoardsRunner) {
  globalState.__sapTopBoardsRunner = {
    activeRunId: null,
    activePromise: null
  };
}
if (!globalState.__sapTopBoardsSchemaPromise) {
  globalState.__sapTopBoardsSchemaPromise = null;
}

function safeJsonParse(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toInt(value, fallback = 0, min = null, max = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  let next = Math.floor(n);
  if (min !== null) next = Math.max(min, next);
  if (max !== null) next = Math.min(max, next);
  return next;
}

function toFloat(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toArray(values, fallback = []) {
  const list = Array.isArray(values) ? values : fallback;
  return list.map((v) => String(v || "").trim()).filter(Boolean);
}

function toLowerArray(values, fallback = []) {
  const list = Array.isArray(values) ? values : fallback;
  return list.map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
}

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function seededRandom(seedValue = 1337) {
  let seed = toInt(seedValue, 1337) >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

function normalizePet(pet, slot) {
  if (!pet || !pet.name) return null;
  const equipment = pet.equipment && typeof pet.equipment === "object"
    ? pet.equipment.name || null
    : pet.equipment || null;
  return {
    slot,
    name: pet.name,
    attack: toInt(pet.attack, 0),
    health: toInt(pet.health, 0),
    exp: toInt(pet.exp, 0),
    equipment,
    mana: toInt(pet.mana, 0),
    timesHurt: Number.isFinite(Number(pet.timesHurt)) ? Number(pet.timesHurt) : null,
    triggersConsumed: Number.isFinite(Number(pet.triggersConsumed)) ? Number(pet.triggersConsumed) : null,
    belugaSwallowedPet: pet.belugaSwallowedPet || null
  };
}

function buildBoardState(calc, side, fallbackTurn) {
  const isPlayer = side === "player";
  const pets = isPlayer ? calc.playerPets : calc.opponentPets;
  return {
    pack: (isPlayer ? calc.playerPack : calc.opponentPack) || "Turtle",
    toyName: (isPlayer ? calc.playerToy : calc.opponentToy) || null,
    toyLevel: toInt(isPlayer ? calc.playerToyLevel : calc.opponentToyLevel, 1, 1),
    turn: toInt(calc.turn, fallbackTurn || 1, 1),
    goldSpent: toInt(isPlayer ? calc.playerGoldSpent : calc.opponentGoldSpent, 0, 0),
    rollAmount: toInt(isPlayer ? calc.playerRollAmount : calc.opponentRollAmount, 0, 0),
    summonedAmount: toInt(isPlayer ? calc.playerSummonedAmount : calc.opponentSummonedAmount, 0, 0),
    level3Sold: toInt(isPlayer ? calc.playerLevel3Sold : calc.opponentLevel3Sold, 0, 0),
    transformationAmount: toInt(
      isPlayer ? calc.playerTransformationAmount : calc.opponentTransformationAmount,
      0,
      0
    ),
    pets: Array.from({ length: 5 }, (_, idx) => normalizePet(pets?.[idx], idx + 1))
  };
}

function canonicalBoard(board) {
  return {
    pack: board.pack || "Turtle",
    toyName: board.toyName || null,
    toyLevel: toInt(board.toyLevel, 1, 1),
    turn: toInt(board.turn, 1, 1),
    goldSpent: toInt(board.goldSpent, 0, 0),
    rollAmount: toInt(board.rollAmount, 0, 0),
    summonedAmount: toInt(board.summonedAmount, 0, 0),
    level3Sold: toInt(board.level3Sold, 0, 0),
    transformationAmount: toInt(board.transformationAmount, 0, 0),
    pets: Array.from({ length: 5 }, (_, idx) => normalizePet(board.pets?.[idx], idx + 1))
  };
}

function hashBoard(board) {
  return crypto.createHash("sha1").update(JSON.stringify(canonicalBoard(board))).digest("hex");
}

function buildSimulationConfig(boardA, boardB, simulationCount) {
  const mapPet = (pet) => {
    if (!pet || !pet.name) return null;
    return {
      name: pet.name,
      attack: toInt(pet.attack, 0),
      health: toInt(pet.health, 0),
      exp: toInt(pet.exp, 0),
      equipment: pet.equipment ? { name: pet.equipment } : null,
      mana: toInt(pet.mana, 0),
      belugaSwallowedPet: pet.belugaSwallowedPet || null,
      abominationSwallowedPet1: null,
      abominationSwallowedPet2: null,
      abominationSwallowedPet3: null,
      battlesFought: 0,
      ...(Number.isFinite(Number(pet.timesHurt)) ? { timesHurt: Number(pet.timesHurt) } : {}),
      ...(Number.isFinite(Number(pet.triggersConsumed))
        ? { triggersConsumed: Number(pet.triggersConsumed) }
        : {})
    };
  };

  return {
    playerPack: boardA.pack || "Turtle",
    opponentPack: boardB.pack || "Turtle",
    playerToy: boardA.toyName || null,
    playerToyLevel: String(toInt(boardA.toyLevel, 1, 1)),
    opponentToy: boardB.toyName || null,
    opponentToyLevel: String(toInt(boardB.toyLevel, 1, 1)),
    turn: Math.max(toInt(boardA.turn, 1, 1), toInt(boardB.turn, 1, 1)),
    playerGoldSpent: toInt(boardA.goldSpent, 0, 0),
    opponentGoldSpent: toInt(boardB.goldSpent, 0, 0),
    playerRollAmount: toInt(boardA.rollAmount, 0, 0),
    opponentRollAmount: toInt(boardB.rollAmount, 0, 0),
    playerSummonedAmount: toInt(boardA.summonedAmount, 0, 0),
    opponentSummonedAmount: toInt(boardB.summonedAmount, 0, 0),
    playerLevel3Sold: toInt(boardA.level3Sold, 0, 0),
    opponentLevel3Sold: toInt(boardB.level3Sold, 0, 0),
    playerTransformationAmount: toInt(boardA.transformationAmount, 0, 0),
    opponentTransformationAmount: toInt(boardB.transformationAmount, 0, 0),
    playerPets: deepClone((boardA.pets || []).map(mapPet)),
    opponentPets: deepClone((boardB.pets || []).map(mapPet)),
    angler: false,
    allPets: false,
    logFilter: null,
    fontSize: 13,
    customPacks: [],
    oldStork: false,
    tokenPets: false,
    komodoShuffle: false,
    mana: true,
    showAdvanced: true,
    logsEnabled: false,
    ailmentEquipment: false,
    simulationCount
  };
}

function previewFromBoard(board) {
  return {
    toy: {
      name: board.toyName || null,
      level: toInt(board.toyLevel, 1, 1)
    },
    pets: (board.pets || [])
      .filter((pet) => pet && pet.name)
      .map((pet, idx) => ({
        slot: idx + 1,
        name: pet.name,
        attack: toInt(pet.attack, 0),
        health: toInt(pet.health, 0),
        level: toInt(pet.exp, 0) >= 5 ? 3 : toInt(pet.exp, 0) >= 2 ? 2 : 1,
        perk: pet.equipment || null
      }))
  };
}

function boardLevelFromExp(exp) {
  const value = toInt(exp, 0, 0);
  if (value >= 5) return 3;
  if (value >= 2) return 2;
  return 1;
}

function computeCandidateHeuristic(board) {
  const pets = Array.isArray(board?.pets) ? board.pets.filter((pet) => pet && pet.name) : [];
  let totalAttack = 0;
  let totalHealth = 0;
  let totalLevels = 0;
  let perkCount = 0;

  for (const pet of pets) {
    totalAttack += toInt(pet.attack, 0, 0);
    totalHealth += toInt(pet.health, 0, 0);
    totalLevels += boardLevelFromExp(pet.exp);
    if (pet.equipment) perkCount += 1;
  }

  const turn = toInt(board?.turn, 1, 1);
  const rollAmount = toInt(board?.rollAmount, 0, 0);
  const goldSpent = toInt(board?.goldSpent, 0, 0);
  const summonedAmount = toInt(board?.summonedAmount, 0, 0);
  const transformedAmount = toInt(board?.transformationAmount, 0, 0);
  const toyLevel = board?.toyName ? toInt(board?.toyLevel, 1, 1) : 0;

  return (
    totalAttack * 1.0 +
    totalHealth * 1.0 +
    totalLevels * 6 +
    pets.length * 8 +
    perkCount * 4 +
    turn * 5 +
    toyLevel * 3 +
    summonedAmount * 1.5 +
    transformedAmount * 1.5 +
    Math.max(0, 30 - rollAmount) * 0.5 +
    Math.max(0, 30 - goldSpent) * 0.25
  );
}

function selectTopCandidates(candidates, maxBoards) {
  if (candidates.length <= maxBoards) return candidates;
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.heuristic !== a.heuristic) return b.heuristic - a.heuristic;
      if (b.boardTurn !== a.boardTurn) return b.boardTurn - a.boardTurn;
      return String(a.boardHash).localeCompare(String(b.boardHash));
    })
    .slice(0, maxBoards);
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function applyElo(boardA, boardB, scoreA, scoreB, kFactor) {
  const expectedA = expectedScore(boardA.rating, boardB.rating);
  const expectedB = 1 - expectedA;
  boardA.rating += kFactor * (scoreA - expectedA);
  boardB.rating += kFactor * (scoreB - expectedB);
}

async function ensureTopBoardsSchema(db) {
  if (!globalState.__sapTopBoardsSchemaPromise) {
    globalState.__sapTopBoardsSchemaPromise = db
      .query(`
        create extension if not exists "uuid-ossp";

        create table if not exists board_rank_runs (
          id uuid primary key default uuid_generate_v4(),
          config_name text not null,
          status text not null default 'queued'
            check (status in ('queued', 'running', 'complete', 'failed', 'canceled')),
          created_by text,
          dataset_version text,
          dataset_match_types text[] not null default '{}'::text[],
          dataset_sides text[] not null default '{}'::text[],
          dataset_limit int not null default 4000,
          config jsonb not null,
          stats jsonb not null default '{}'::jsonb,
          error text,
          started_at timestamptz,
          finished_at timestamptz,
          created_at timestamptz not null default now()
        );
        create index if not exists idx_board_rank_runs_created_at
          on board_rank_runs(created_at desc);
        create index if not exists idx_board_rank_runs_status_created_at
          on board_rank_runs(status, created_at desc);

        create table if not exists board_rank_boards (
          id uuid primary key default uuid_generate_v4(),
          run_id uuid not null references board_rank_runs(id) on delete cascade,
          source_replay_id uuid not null references replays(id) on delete cascade,
          source_turn_number int not null,
          source_side text not null check (source_side in ('player', 'opponent')),
          board_hash text not null,
          board_pack text,
          board_turn int,
          board_state jsonb not null,
          stage text not null default 'candidate'
            check (stage in ('candidate', 'qualifier', 'semifinal', 'final', 'published')),
          rating float8 not null default 1500,
          qualifier_matches int not null default 0,
          qualifier_wins int not null default 0,
          qualifier_draws int not null default 0,
          semifinal_matches int not null default 0,
          semifinal_wins int not null default 0,
          semifinal_draws int not null default 0,
          final_matches int not null default 0,
          final_wins int not null default 0,
          final_draws int not null default 0,
          final_rank int,
          is_top_100 boolean not null default false,
          created_at timestamptz not null default now(),
          unique (run_id, source_replay_id, source_side),
          unique (run_id, board_hash)
        );
        create index if not exists idx_board_rank_boards_run_stage
          on board_rank_boards(run_id, stage);
        create index if not exists idx_board_rank_boards_run_rank
          on board_rank_boards(run_id, final_rank asc nulls last);
        create index if not exists idx_board_rank_boards_run_top
          on board_rank_boards(run_id, is_top_100, final_rank asc nulls last);

        create table if not exists board_rank_pairings (
          id bigserial primary key,
          run_id uuid not null references board_rank_runs(id) on delete cascade,
          stage text not null check (stage in ('qualifier', 'semifinal', 'final')),
          board_a_id uuid not null references board_rank_boards(id) on delete cascade,
          board_b_id uuid not null references board_rank_boards(id) on delete cascade,
          simulation_count int not null check (simulation_count > 0),
          board_a_wins int not null default 0,
          board_b_wins int not null default 0,
          draws int not null default 0,
          score_a float8 generated always as ((board_a_wins + draws * 0.5) / nullif(simulation_count, 0)) stored,
          score_b float8 generated always as ((board_b_wins + draws * 0.5) / nullif(simulation_count, 0)) stored,
          seed int,
          simulated_at timestamptz not null default now(),
          constraint chk_board_rank_pairing_different_boards check (board_a_id <> board_b_id),
          constraint chk_board_rank_pairing_total check (board_a_wins + board_b_wins + draws = simulation_count)
        );
        create unique index if not exists idx_board_rank_pairings_unique_pair
          on board_rank_pairings (
            run_id,
            stage,
            least(board_a_id::text, board_b_id::text),
            greatest(board_a_id::text, board_b_id::text)
          );
        create index if not exists idx_board_rank_pairings_run_stage
          on board_rank_pairings(run_id, stage, simulated_at desc);
        create index if not exists idx_board_rank_pairings_board_a
          on board_rank_pairings(board_a_id);
        create index if not exists idx_board_rank_pairings_board_b
          on board_rank_pairings(board_b_id);

        create table if not exists board_rank_results (
          run_id uuid not null references board_rank_runs(id) on delete cascade,
          board_id uuid not null references board_rank_boards(id) on delete cascade,
          rank int not null check (rank > 0),
          rating float8 not null,
          win_rate float8 not null check (win_rate >= 0 and win_rate <= 1),
          wins int not null default 0,
          losses int not null default 0,
          draws int not null default 0,
          matches int not null default 0,
          strength_of_schedule float8,
          created_at timestamptz not null default now(),
          primary key (run_id, board_id),
          unique (run_id, rank)
        );
        create index if not exists idx_board_rank_results_run_rank
          on board_rank_results(run_id, rank);
        create index if not exists idx_board_rank_results_run_win_rate
          on board_rank_results(run_id, win_rate desc);

        create table if not exists board_rank_latest (
          scope_key text primary key,
          run_id uuid not null references board_rank_runs(id) on delete cascade,
          updated_at timestamptz not null default now()
        );
        create index if not exists idx_board_rank_latest_run_id
          on board_rank_latest(run_id);

        create table if not exists board_rank_autorun_state (
          scope_key text primary key,
          pending_replays int not null default 0 check (pending_replays >= 0),
          last_replay_created_at timestamptz,
          last_triggered_run_id uuid references board_rank_runs(id) on delete set null,
          updated_at timestamptz not null default now()
        );
        create index if not exists idx_board_rank_autorun_state_updated_at
          on board_rank_autorun_state(updated_at desc);
      `)
      .catch((error) => {
        globalState.__sapTopBoardsSchemaPromise = null;
        throw error;
      });
  }
  await globalState.__sapTopBoardsSchemaPromise;
}

function resolveConfigPath(configName) {
  const input = String(configName || DEFAULT_CONFIG_NAME).trim();
  const cwd = process.cwd();
  if (!input || input === DEFAULT_CONFIG_NAME) {
    return path.join(cwd, "configs", DEFAULT_CONFIG_FILE);
  }
  if (input.includes("/") || input.includes("\\") || input.endsWith(".json")) {
    return path.isAbsolute(input) ? input : path.join(cwd, input);
  }
  return path.join(cwd, "configs", `${input}.json`);
}

function deepMerge(base, override) {
  if (override === undefined) return base;
  if (base === null || typeof base !== "object" || Array.isArray(base)) return override;
  if (override === null || typeof override !== "object" || Array.isArray(override)) return override;
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    merged[key] = key in merged ? deepMerge(merged[key], value) : value;
  }
  return merged;
}

function loadTopBoardsConfig(configName = DEFAULT_CONFIG_NAME, configOverride = null) {
  const filePath = resolveConfigPath(configName);
  const source = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const merged = configOverride ? deepMerge(source, configOverride) : source;
  const config = {
    configName: merged.configName || configName || DEFAULT_CONFIG_NAME,
    dataset: {
      version: merged?.dataset?.version || "current",
      matchTypes: toLowerArray(merged?.dataset?.matchTypes, DEFAULT_MATCH_TYPES),
      sides: toLowerArray(merged?.dataset?.sides, DEFAULT_SIDES),
      excludePacks: toArray(merged?.dataset?.excludePacks, DEFAULT_EXCLUDED_PACKS),
      minTurn: toInt(merged?.dataset?.minTurn, 1, 1),
      maxTurn:
        merged?.dataset?.maxTurn === null || merged?.dataset?.maxTurn === undefined
          ? null
          : toInt(merged?.dataset?.maxTurn, 1, 1),
      maxBoards: toInt(merged?.dataset?.maxBoards, 4000, 50, 50000),
      replayScanMultiplier: toInt(merged?.dataset?.replayScanMultiplier, 8, 1, 100),
      sampleSeed: toInt(merged?.dataset?.sampleSeed, 1337),
      dedupeByBoardHash: merged?.dataset?.dedupeByBoardHash !== false
    },
    stages: {
      qualifier: {
        opponentsPerBoard: toInt(merged?.stages?.qualifier?.opponentsPerBoard, 30, 1, 500),
        simulationCount: toInt(merged?.stages?.qualifier?.simulationCount, 3, 1, 1000),
        keepTop: toInt(merged?.stages?.qualifier?.keepTop, 400, 10, 5000)
      },
      semifinal: {
        rounds: toInt(merged?.stages?.semifinal?.rounds, 25, 1, 500),
        simulationCount: toInt(merged?.stages?.semifinal?.simulationCount, 7, 1, 1000),
        keepTop: toInt(merged?.stages?.semifinal?.keepTop, 120, 10, 5000)
      },
      final: {
        simulationCount: toInt(merged?.stages?.final?.simulationCount, 25, 1, 1000)
      }
    },
    rating: {
      initialRating: toFloat(merged?.rating?.initialRating, 1500),
      kFactor: toFloat(merged?.rating?.kFactor, 16),
      drawValue: toFloat(merged?.rating?.drawValue, 0.5)
    },
    execution: {
      batchSize: toInt(merged?.execution?.batchSize, 200, 10, 2000),
      maxMinutes: toInt(merged?.execution?.maxMinutes, 360, 1, 1440),
      retryOnError: toInt(merged?.execution?.retryOnError, 1, 0, 5),
      checkpointEveryPairs: toInt(merged?.execution?.checkpointEveryPairs, 1000, 50, 50000)
    },
    publish: {
      scopeKeyTemplate:
        merged?.publish?.scopeKeyTemplate || "version={version}|matchType={matchTypes}|sides={sides}",
      replaceLatest: merged?.publish?.replaceLatest !== false
    }
  };

  if (!config.dataset.matchTypes.length) config.dataset.matchTypes = DEFAULT_MATCH_TYPES.slice();
  config.dataset.sides = config.dataset.sides.filter((side) => side === "player" || side === "opponent");
  if (!config.dataset.sides.length) config.dataset.sides = DEFAULT_SIDES.slice();
  return config;
}

async function resolveDatasetVersion(db, versionValue) {
  const normalized = String(versionValue || "current").trim().toLowerCase();
  if (!normalized || normalized === "all") return null;
  if (normalized !== "current") return versionValue;
  const { rows } = await db.query(
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

function buildRandomPairs(boardIds, rounds, random) {
  const pairs = [];
  const seen = new Set();
  for (let round = 0; round < rounds; round += 1) {
    const shuffled = shuffle(boardIds, random);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      const key = pairKey(shuffled[i], shuffled[i + 1]);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([shuffled[i], shuffled[i + 1]]);
    }
  }
  return pairs;
}

function buildSwissPairs(boards, rounds, random) {
  const pairs = [];
  const seen = new Set();
  let working = boards.slice();
  for (let round = 0; round < rounds; round += 1) {
    const ordered = working
      .slice()
      .sort((a, b) => (b.rating - a.rating) || String(a.id).localeCompare(String(b.id)));
    const used = new Set();
    const roundPairs = [];
    for (let i = 0; i < ordered.length; i += 1) {
      const a = ordered[i];
      if (used.has(a.id)) continue;
      let choice = null;
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = ordered[j];
        if (used.has(b.id)) continue;
        const key = pairKey(a.id, b.id);
        if (seen.has(key)) continue;
        choice = b;
        break;
      }
      if (!choice) continue;
      used.add(a.id);
      used.add(choice.id);
      const key = pairKey(a.id, choice.id);
      seen.add(key);
      roundPairs.push([a.id, choice.id]);
    }
    pairs.push(...shuffle(roundPairs, random));
    working = ordered;
  }
  return pairs;
}

function buildRoundRobinPairs(boardIds) {
  const pairs = [];
  for (let i = 0; i < boardIds.length; i += 1) {
    for (let j = i + 1; j < boardIds.length; j += 1) {
      pairs.push([boardIds[i], boardIds[j]]);
    }
  }
  return pairs;
}

function scopeKeyFromConfig(template, version, matchTypes, sides) {
  return String(template || "version={version}|matchType={matchTypes}|sides={sides}")
    .replace("{version}", version || "all")
    .replace("{matchTypes}", (matchTypes || []).join(",") || "all")
    .replace("{sides}", (sides || []).join(",") || "both");
}

async function updateRun(db, runId, updates) {
  const entries = Object.entries(updates || {});
  if (!entries.length) return;
  const values = [];
  const assignments = [];
  let idx = 1;
  for (const [key, value] of entries) {
    assignments.push(`${key} = $${idx}`);
    values.push(value);
    idx += 1;
  }
  values.push(runId);
  await db.query(
    `
      update board_rank_runs
      set ${assignments.join(", ")}
      where id = $${idx}
    `,
    values
  );
}

async function createRunRecord(db, config, createdBy) {
  const { rows } = await db.query(
    `
      insert into board_rank_runs (
        config_name,
        status,
        created_by,
        dataset_match_types,
        dataset_sides,
        dataset_limit,
        config
      )
      values ($1, 'queued', $2, $3, $4, $5, $6::jsonb)
      returning id
    `,
    [
      config.configName || DEFAULT_CONFIG_NAME,
      createdBy || null,
      config.dataset.matchTypes,
      config.dataset.sides,
      config.dataset.maxBoards,
      JSON.stringify(config)
    ]
  );
  return rows[0]?.id || null;
}

async function insertBoards(db, runId, rows, initialRating, batchSize) {
  const inserted = [];
  for (const group of chunk(rows, batchSize)) {
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of group) {
      placeholders.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, 'candidate', $${idx++})`
      );
      values.push(
        runId,
        row.sourceReplayId,
        row.sourceTurnNumber,
        row.sourceSide,
        row.boardHash,
        row.boardPack,
        row.boardTurn,
        row.boardState,
        initialRating
      );
    }
    const { rows: insertedRows } = await db.query(
      `
        insert into board_rank_boards (
          run_id,
          source_replay_id,
          source_turn_number,
          source_side,
          board_hash,
          board_pack,
          board_turn,
          board_state,
          stage,
          rating
        )
        values ${placeholders.join(", ")}
        on conflict (run_id, board_hash) do nothing
        returning id, board_hash
      `,
      values
    );
    inserted.push(...insertedRows);
  }
  return inserted;
}

async function insertPairings(db, runId, stage, rows, batchSize) {
  if (!rows.length) return;
  for (const group of chunk(rows, batchSize)) {
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of group) {
      placeholders.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      values.push(
        runId,
        stage,
        row.boardAId,
        row.boardBId,
        row.simulationCount,
        row.boardAWins,
        row.boardBWins,
        row.draws,
        row.seed
      );
    }
    await db.query(
      `
        insert into board_rank_pairings (
          run_id,
          stage,
          board_a_id,
          board_b_id,
          simulation_count,
          board_a_wins,
          board_b_wins,
          draws,
          seed
        )
        values ${placeholders.join(", ")}
        on conflict do nothing
      `,
      values
    );
  }
}

async function persistBoards(db, boardMap, batchSize) {
  const rows = Array.from(boardMap.values());
  for (const group of chunk(rows, batchSize)) {
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of group) {
      placeholders.push(
        `($${idx++}::uuid, $${idx++}::text, $${idx++}::float8, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::boolean)`
      );
      values.push(
        row.id,
        row.stage,
        row.rating,
        row.qualifierMatches,
        row.qualifierWins,
        row.qualifierDraws,
        row.semifinalMatches,
        row.semifinalWins,
        row.semifinalDraws,
        row.finalMatches,
        row.finalWins,
        row.finalDraws,
        row.finalRank,
        row.isTop100
      );
    }
    await db.query(
      `
        update board_rank_boards b
        set
          stage = v.stage,
          rating = v.rating,
          qualifier_matches = v.qualifier_matches,
          qualifier_wins = v.qualifier_wins,
          qualifier_draws = v.qualifier_draws,
          semifinal_matches = v.semifinal_matches,
          semifinal_wins = v.semifinal_wins,
          semifinal_draws = v.semifinal_draws,
          final_matches = v.final_matches,
          final_wins = v.final_wins,
          final_draws = v.final_draws,
          final_rank = v.final_rank,
          is_top_100 = v.is_top_100
        from (
          values ${placeholders.join(", ")}
        ) as v(
          id,
          stage,
          rating,
          qualifier_matches,
          qualifier_wins,
          qualifier_draws,
          semifinal_matches,
          semifinal_wins,
          semifinal_draws,
          final_matches,
          final_wins,
          final_draws,
          final_rank,
          is_top_100
        )
        where b.id = v.id
      `,
      values
    );
  }
}

async function persistResults(db, runId, rows, batchSize) {
  await db.query(`delete from board_rank_results where run_id = $1`, [runId]);
  if (!rows.length) return;
  for (const group of chunk(rows, batchSize)) {
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const row of group) {
      placeholders.push(
        `($${idx++}::uuid, $${idx++}::uuid, $${idx++}::int, $${idx++}::float8, $${idx++}::float8, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::int, $${idx++}::float8)`
      );
      values.push(
        runId,
        row.boardId,
        row.rank,
        row.rating,
        row.winRate,
        row.wins,
        row.losses,
        row.draws,
        row.matches,
        row.strengthOfSchedule
      );
    }
    await db.query(
      `
        insert into board_rank_results (
          run_id,
          board_id,
          rank,
          rating,
          win_rate,
          wins,
          losses,
          draws,
          matches,
          strength_of_schedule
        )
        values ${placeholders.join(", ")}
      `,
      values
    );
  }
}

function normalizeBoardRow(row, initialRating) {
  return {
    ...row,
    rating: toFloat(row.rating, initialRating),
    stage: row.stage || "candidate",
    qualifierMatches: toInt(row.qualifierMatches, 0, 0),
    qualifierWins: toInt(row.qualifierWins, 0, 0),
    qualifierDraws: toInt(row.qualifierDraws, 0, 0),
    semifinalMatches: toInt(row.semifinalMatches, 0, 0),
    semifinalWins: toInt(row.semifinalWins, 0, 0),
    semifinalDraws: toInt(row.semifinalDraws, 0, 0),
    finalMatches: toInt(row.finalMatches, 0, 0),
    finalWins: toInt(row.finalWins, 0, 0),
    finalDraws: toInt(row.finalDraws, 0, 0),
    finalRank: row.finalRank ?? null,
    isTop100: Boolean(row.isTop100)
  };
}

function normalizeSimulationResult(raw, simulationCount) {
  const boardAWins = toInt(raw?.playerWins, 0, 0);
  const boardBWins = toInt(raw?.opponentWins, 0, 0);
  const draws = toInt(raw?.draws, 0, 0);
  if (boardAWins + boardBWins + draws !== simulationCount) {
    return { boardAWins: 0, boardBWins: 0, draws: simulationCount, hadError: true };
  }
  return { boardAWins, boardBWins, draws, hadError: false };
}

function runPairSimulation(simConfig, calculatorModule) {
  if (typeof calculatorModule?.runHeadlessSimulation === "function") {
    return calculatorModule.runHeadlessSimulation(simConfig, {
      enableLogs: false,
      includeBattles: false
    });
  }
  if (typeof calculatorModule?.runSimulation === "function") {
    const result = calculatorModule.runSimulation(simConfig);
    if (result && typeof result === "object") {
      delete result.battles;
      delete result.randomDecisions;
    }
    return result;
  }
  throw new Error("sap-calculator does not export runSimulation/runHeadlessSimulation");
}

function logInfo(logger, message, payload = null) {
  if (!logger || typeof logger.log !== "function") return;
  if (payload) logger.log(message, payload);
  else logger.log(message);
}

async function parseReplayCandidates(replayRows, config, logger) {
  const candidates = [];
  const seenHashes = new Set();
  let extractionErrors = 0;

  for (const replayRow of replayRows) {
    try {
      const rawReplay = replayRow.raw_json;
      const actions = Array.isArray(rawReplay?.Actions) ? rawReplay.Actions : [];
      const battles = actions
        .filter((action) => action?.Type === 0 && action?.Battle)
        .map((action) => safeJsonParse(action.Battle))
        .filter(Boolean);
      if (!battles.length) continue;

      const finalTurn = battles.length;
      if (finalTurn < config.dataset.minTurn) continue;
      if (config.dataset.maxTurn !== null && finalTurn > config.dataset.maxTurn) continue;

      let buildModel = safeJsonParse(rawReplay?.GenesisModeModel);
      if (!buildModel) {
        for (let i = actions.length - 1; i >= 0; i -= 1) {
          const action = actions[i];
          if (action?.Type === 1 && action?.Mode) {
            buildModel = safeJsonParse(action.Mode);
            if (buildModel) break;
          }
        }
      }

      const calc = parseReplayForCalculator(battles[battles.length - 1], buildModel);
      for (const side of config.dataset.sides) {
        const board = buildBoardState(calc, side, finalTurn);
        const boardHash = hashBoard(board);
        if (config.dataset.dedupeByBoardHash && seenHashes.has(boardHash)) continue;
        seenHashes.add(boardHash);
        candidates.push({
          sourceReplayId: replayRow.id,
          sourceTurnNumber: finalTurn,
          sourceSide: side,
          boardHash,
          boardPack: board.pack,
          boardTurn: board.turn,
          heuristic: computeCandidateHeuristic(board),
          boardState: board
        });
      }
    } catch (error) {
      extractionErrors += 1;
    }
  }

  logInfo(logger, "Top boards extraction complete", {
    candidates: candidates.length,
    extractionErrors
  });

  return { candidates, extractionErrors };
}

async function runTopBoardsJob({ db, runId, config, logger = console }) {
  const startedAt = Date.now();
  const random = seededRandom(config.dataset.sampleSeed);
  const drawValue = toFloat(config.rating.drawValue, 0.5);
  const initialRating = toFloat(config.rating.initialRating, 1500);
  const kFactor = toFloat(config.rating.kFactor, 16);
  const stats = {
    extractionErrors: 0,
    simulationErrors: 0,
    candidateBoards: 0,
    qualifierPairs: 0,
    semifinalPairs: 0,
    finalPairs: 0
  };

  try {
    await updateRun(db, runId, {
      status: "running",
      started_at: new Date().toISOString(),
      error: null
    });

    const version = await resolveDatasetVersion(db, config.dataset.version);
    await updateRun(db, runId, { dataset_version: version });

    const replayLimit = Math.max(config.dataset.maxBoards * config.dataset.replayScanMultiplier, 2000);
    let replayRows = (await db.query(
      `
        select id, raw_json, pack, opponent_pack, match_type, game_version, created_at
        from replays
        where raw_json is not null
          and pack is not null
          and opponent_pack is not null
          and ($1::text[] is null or lower(coalesce(match_type, '')) = any($1::text[]))
          and ($2::text is null or game_version = $2::text)
          and pack != all($3::text[])
          and opponent_pack != all($3::text[])
        order by created_at desc
        limit $4
      `,
      [
        config.dataset.matchTypes?.length ? config.dataset.matchTypes : null,
        version,
        config.dataset.excludePacks?.length ? config.dataset.excludePacks : DEFAULT_EXCLUDED_PACKS,
        replayLimit
      ]
    )).rows;

    const parsed = await parseReplayCandidates(replayRows, config, logger);
    const selectedCandidates = selectTopCandidates(parsed.candidates, config.dataset.maxBoards);
    stats.candidateBoards = selectedCandidates.length;
    stats.totalCandidatesParsed = parsed.candidates.length;
    stats.extractionErrors = parsed.extractionErrors;
    replayRows.length = 0;
    replayRows = null;

    if (!selectedCandidates.length) {
      throw new Error("No candidate boards found for this scope.");
    }

    const inserted = await insertBoards(
      db,
      runId,
      selectedCandidates,
      initialRating,
      config.execution.batchSize
    );
    const idByHash = new Map(inserted.map((row) => [row.board_hash, row.id]));

    const boardMap = new Map();
    for (const candidate of selectedCandidates) {
      const id = idByHash.get(candidate.boardHash);
      if (!id) continue;
      boardMap.set(
        id,
        normalizeBoardRow(
          {
            id,
            sourceReplayId: candidate.sourceReplayId,
            sourceTurnNumber: candidate.sourceTurnNumber,
            sourceSide: candidate.sourceSide,
            boardPack: candidate.boardPack,
            boardTurn: candidate.boardTurn,
            boardState: candidate.boardState,
            preview: previewFromBoard(candidate.boardState)
          },
          initialRating
        )
      );
    }
    parsed.candidates.length = 0;
    const boards = Array.from(boardMap.values());
    const boardById = new Map(boards.map((row) => [row.id, row]));
    const calculatorModule = require("sap-calculator");

    const simulateStage = async (stage, pairs, simulationCount, options = {}) => {
      const collectRows = options.collectRows === true;
      const collectedRows = collectRows ? [] : null;
      let insertBuffer = [];
      const flushPairings = async () => {
        if (!insertBuffer.length) return;
        await insertPairings(db, runId, stage, insertBuffer, config.execution.batchSize);
        insertBuffer = [];
      };
      let processed = 0;
      for (const [aId, bId] of pairs) {
        const boardA = boardById.get(aId);
        const boardB = boardById.get(bId);
        if (!boardA || !boardB) continue;

        let normalized = null;
        for (let attempt = 0; attempt <= config.execution.retryOnError; attempt += 1) {
          try {
            const simConfig = buildSimulationConfig(boardA.boardState, boardB.boardState, simulationCount);
            normalized = normalizeSimulationResult(runPairSimulation(simConfig, calculatorModule), simulationCount);
            if (!normalized.hadError) break;
          } catch {
            normalized = { boardAWins: 0, boardBWins: 0, draws: simulationCount, hadError: true };
          }
        }
        if (!normalized || normalized.hadError) {
          stats.simulationErrors += 1;
          normalized = { boardAWins: 0, boardBWins: 0, draws: simulationCount, hadError: true };
        }

        const scoreA = (normalized.boardAWins + normalized.draws * drawValue) / simulationCount;
        const scoreB = (normalized.boardBWins + normalized.draws * drawValue) / simulationCount;
        applyElo(boardA, boardB, scoreA, scoreB, kFactor);

        if (stage === "qualifier") {
          boardA.qualifierMatches += 1;
          boardB.qualifierMatches += 1;
          boardA.qualifierWins += normalized.boardAWins;
          boardB.qualifierWins += normalized.boardBWins;
          boardA.qualifierDraws += normalized.draws;
          boardB.qualifierDraws += normalized.draws;
        } else if (stage === "semifinal") {
          boardA.semifinalMatches += 1;
          boardB.semifinalMatches += 1;
          boardA.semifinalWins += normalized.boardAWins;
          boardB.semifinalWins += normalized.boardBWins;
          boardA.semifinalDraws += normalized.draws;
          boardB.semifinalDraws += normalized.draws;
        } else if (stage === "final") {
          boardA.finalMatches += 1;
          boardB.finalMatches += 1;
          boardA.finalWins += normalized.boardAWins;
          boardB.finalWins += normalized.boardBWins;
          boardA.finalDraws += normalized.draws;
          boardB.finalDraws += normalized.draws;
        }

        const pairingRow = {
          boardAId: aId,
          boardBId: bId,
          simulationCount,
          boardAWins: normalized.boardAWins,
          boardBWins: normalized.boardBWins,
          draws: normalized.draws,
          seed: toInt(Math.floor(random() * 1_000_000_000), 0)
        };
        insertBuffer.push(pairingRow);
        if (collectRows) collectedRows.push(pairingRow);
        if (insertBuffer.length >= config.execution.batchSize) {
          await flushPairings();
        }

        processed += 1;
        if (processed % config.execution.checkpointEveryPairs === 0) {
          logInfo(logger, `Top boards ${stage} progress`, { processed, total: pairs.length });
          await updateRun(db, runId, { stats: JSON.stringify(stats) });
        }
        if ((Date.now() - startedAt) / 60000 > config.execution.maxMinutes) {
          throw new Error(`Top boards run exceeded maxMinutes (${config.execution.maxMinutes}).`);
        }
      }
      await flushPairings();
      return collectedRows || [];
    };

    const qualifierPairs = buildRandomPairs(
      boards.map((row) => row.id),
      config.stages.qualifier.opponentsPerBoard,
      random
    );
    stats.qualifierPairs = qualifierPairs.length;
    await simulateStage("qualifier", qualifierPairs, config.stages.qualifier.simulationCount);

    const qualifierTop = boards
      .slice()
      .sort((a, b) => (b.rating - a.rating) || String(a.id).localeCompare(String(b.id)))
      .slice(0, Math.min(config.stages.qualifier.keepTop, boards.length));
    const qualifierTopSet = new Set(qualifierTop.map((row) => row.id));
    for (const board of boards) {
      if (qualifierTopSet.has(board.id)) board.stage = "qualifier";
    }

    const semifinalPairs = buildSwissPairs(qualifierTop, config.stages.semifinal.rounds, random);
    stats.semifinalPairs = semifinalPairs.length;
    await simulateStage("semifinal", semifinalPairs, config.stages.semifinal.simulationCount);

    const semifinalTop = qualifierTop
      .slice()
      .sort((a, b) => (b.rating - a.rating) || String(a.id).localeCompare(String(b.id)))
      .slice(0, Math.min(config.stages.semifinal.keepTop, qualifierTop.length));
    const semifinalSet = new Set(semifinalTop.map((row) => row.id));
    for (const board of boards) {
      if (semifinalSet.has(board.id)) board.stage = "semifinal";
    }

    const finalists = semifinalTop
      .slice()
      .sort((a, b) => (b.rating - a.rating) || String(a.id).localeCompare(String(b.id)));
    const finalPairs = buildRoundRobinPairs(finalists.map((row) => row.id));
    stats.finalPairs = finalPairs.length;
    const finalPairRows = await simulateStage("final", finalPairs, config.stages.final.simulationCount, {
      collectRows: true
    });

    const finalStats = new Map(
      finalists.map((row) => [
        row.id,
        { boardId: row.id, wins: 0, losses: 0, draws: 0, matches: 0, opponents: new Set() }
      ])
    );
    for (const row of finalPairRows) {
      const a = finalStats.get(row.boardAId);
      const b = finalStats.get(row.boardBId);
      if (!a || !b) continue;
      a.wins += row.boardAWins;
      a.losses += row.boardBWins;
      a.draws += row.draws;
      a.matches += 1;
      a.opponents.add(row.boardBId);
      b.wins += row.boardBWins;
      b.losses += row.boardAWins;
      b.draws += row.draws;
      b.matches += 1;
      b.opponents.add(row.boardAId);
    }

    const winRateMap = new Map();
    const preliminary = finalists.map((board) => {
      const info = finalStats.get(board.id);
      const total = info.wins + info.losses + info.draws;
      const winRate = total > 0 ? (info.wins + info.draws * drawValue) / total : 0;
      winRateMap.set(board.id, winRate);
      return { boardId: board.id, rating: board.rating, ...info, winRate };
    });

    const ranked = preliminary.map((row) => {
      let sos = 0;
      if (row.opponents.size) {
        let sum = 0;
        let count = 0;
        for (const opponentId of row.opponents) {
          sum += toFloat(winRateMap.get(opponentId), 0);
          count += 1;
        }
        sos = count ? sum / count : 0;
      }
      return { ...row, strengthOfSchedule: sos };
    });
    ranked.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.strengthOfSchedule !== a.strengthOfSchedule) return b.strengthOfSchedule - a.strengthOfSchedule;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return String(a.boardId).localeCompare(String(b.boardId));
    });

    const resultRows = ranked.map((row, idx) => ({
      rank: idx + 1,
      boardId: row.boardId,
      rating: row.rating,
      winRate: row.winRate,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      matches: row.matches,
      strengthOfSchedule: row.strengthOfSchedule
    }));
    await persistResults(db, runId, resultRows, config.execution.batchSize);

    const rankByBoardId = new Map(resultRows.map((row) => [row.boardId, row]));
    for (const board of boards) {
      const rankedRow = rankByBoardId.get(board.id);
      if (rankedRow) {
        board.finalRank = rankedRow.rank;
        board.isTop100 = true;
        board.stage = "published";
      } else {
        board.finalRank = null;
        board.isTop100 = false;
      }
    }
    await persistBoards(db, boardMap, config.execution.batchSize);

    const scopeKey = scopeKeyFromConfig(
      config.publish.scopeKeyTemplate,
      version,
      config.dataset.matchTypes,
      config.dataset.sides
    );
    if (config.publish.replaceLatest) {
      await db.query(
        `
          insert into board_rank_latest (scope_key, run_id, updated_at)
          values ($1, $2, now())
          on conflict (scope_key)
          do update set run_id = excluded.run_id, updated_at = excluded.updated_at
        `,
        [scopeKey, runId]
      );
    }

    const finishedStats = { ...stats, finalTopN: resultRows.length, scopeKey };
    await updateRun(db, runId, {
      status: "complete",
      stats: JSON.stringify(finishedStats),
      finished_at: new Date().toISOString(),
      dataset_version: version
    });

    return { runId, status: "complete", stats: finishedStats };
  } catch (error) {
    await updateRun(db, runId, {
      status: "failed",
      error: String(error?.message || error || "failed"),
      stats: JSON.stringify(stats),
      finished_at: new Date().toISOString()
    });
    throw error;
  }
}

async function assertNoRunningRun(db) {
  const { rows } = await db.query(
    `
      select id
      from board_rank_runs
      where status = 'running'
      order by started_at desc nulls last, created_at desc
      limit 1
    `
  );
  return rows[0]?.id || null;
}

async function failRunningRun(db, runId, reason) {
  if (!runId) return;
  await db.query(
    `
      update board_rank_runs
      set
        status = 'failed',
        error = coalesce(nullif(error, ''), $2),
        finished_at = coalesce(finished_at, now())
      where id = $1
        and status = 'running'
    `,
    [runId, reason || "superseded by forced run start"]
  );
}

async function startTopBoardsRun({
  db,
  configName = DEFAULT_CONFIG_NAME,
  configOverride = null,
  createdBy = null,
  logger = console,
  sync = false,
  force = false
}) {
  await ensureTopBoardsSchema(db);
  if (globalState.__sapTopBoardsRunner.activeRunId) {
    const error = new Error("A top boards run is already active.");
    error.code = "RUN_IN_PROGRESS";
    error.runId = globalState.__sapTopBoardsRunner.activeRunId;
    throw error;
  }
  const dbRunning = await assertNoRunningRun(db);
  if (dbRunning) {
    if (force) {
      await failRunningRun(
        db,
        dbRunning,
        `superseded by forced run start at ${new Date().toISOString()}`
      );
      logInfo(logger, "Forced takeover of existing running top boards run", { supersededRunId: dbRunning });
    } else {
      const error = new Error("A top boards run is already marked as running.");
      error.code = "RUN_IN_PROGRESS";
      error.runId = dbRunning;
      throw error;
    }
  }

  const staleRunning = await assertNoRunningRun(db);
  if (staleRunning) {
    const error = new Error("A top boards run is already marked as running.");
    error.code = "RUN_IN_PROGRESS";
    error.runId = staleRunning;
    throw error;
  }

  const config = loadTopBoardsConfig(configName, configOverride);
  const runId = await createRunRecord(db, config, createdBy);
  if (!runId) throw new Error("Could not create top boards run.");

  const promise = runTopBoardsJob({ db, runId, config, logger }).finally(() => {
    if (globalState.__sapTopBoardsRunner.activeRunId === runId) {
      globalState.__sapTopBoardsRunner.activeRunId = null;
      globalState.__sapTopBoardsRunner.activePromise = null;
    }
  });
  globalState.__sapTopBoardsRunner.activeRunId = runId;
  globalState.__sapTopBoardsRunner.activePromise = promise;

  if (sync) {
    const result = await promise;
    return { runId, status: result.status };
  }

  promise.catch((error) => {
    if (logger && typeof logger.error === "function") {
      logger.error("Top boards run failed", {
        runId,
        error: error?.message || error
      });
    }
  });

  return { runId, status: "queued" };
}

async function runTopBoardsOnce({
  db,
  configName = DEFAULT_CONFIG_NAME,
  configOverride = null,
  createdBy = "script",
  logger = console,
  force = false
}) {
  const started = await startTopBoardsRun({
    db,
    configName,
    configOverride,
    createdBy,
    logger,
    sync: true,
    force
  });
  const { rows } = await db.query(
    `
      select status, stats, error
      from board_rank_runs
      where id = $1
    `,
    [started.runId]
  );
  return {
    runId: started.runId,
    status: rows[0]?.status || started.status,
    stats: rows[0]?.stats || {},
    error: rows[0]?.error || null
  };
}

function getTopBoardsRunnerState() {
  return {
    activeRunId: globalState.__sapTopBoardsRunner.activeRunId || null
  };
}

module.exports = {
  DEFAULT_CONFIG_NAME,
  ensureTopBoardsSchema,
  loadTopBoardsConfig,
  startTopBoardsRun,
  runTopBoardsOnce,
  getTopBoardsRunnerState
};
