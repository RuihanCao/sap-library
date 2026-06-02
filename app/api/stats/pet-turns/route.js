import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureHiddenPlayersTable, hiddenReplayClause } from "@/lib/hiddenPlayers";
import { resolveVersionFilter } from "@/lib/versionFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_KEYS = 300;
const globalForCache = globalThis;
const responseCache = globalForCache.__sapPetTurnsCache || new Map();
if (!globalForCache.__sapPetTurnsCache) {
  globalForCache.__sapPetTurnsCache = responseCache;
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

// Per-turn winrate breakdown for a single pet, used by the stats-page
// drill-down. It applies the same replay-level filters as the main pet table
// (pack/version/elo/player/tags/ally/opponent + pet level + turn range) so the
// totals reconcile with the card the user clicked.
export async function GET(req) {
  await ensureHiddenPlayersTable(pool);

  const cacheKey = req.url;
  const cacheHit = responseCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cacheHit.payload, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120", "X-Cache": "HIT" }
    });
  }

  const { searchParams } = new URL(req.url);
  const petName = (searchParams.get("petName") || "").trim();
  if (!petName) {
    return NextResponse.json({ error: "petName is required" }, { status: 400 });
  }

  const pack = searchParams.get("pack") || "";
  const opponentPack = searchParams.get("opponentPack") || "";
  const winningPack = searchParams.get("winningPack") || "";
  const losingPack = searchParams.get("losingPack") || "";
  const excludePack = searchParams.get("excludePack") || "";
  const excludeMirrors = searchParams.get("excludeMirrors") === "true";
  const player = searchParams.get("player") || "";
  const playerId = searchParams.get("playerId") || "";
  const num = (raw) =>
    raw !== null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
  const minElo = num(searchParams.get("minElo"));
  const maxElo = num(searchParams.get("maxElo"));
  const minTurn = num(searchParams.get("minTurn"));
  const maxTurn = num(searchParams.get("maxTurn"));
  const petLevel = searchParams.get("petLevel") || "";
  const allyPet = parseList(searchParams.get("allyPet"));
  const opponentPet = parseList(searchParams.get("opponentPet"));
  const allyPerk = parseList(searchParams.get("allyPerk"));
  const opponentPerk = parseList(searchParams.get("opponentPerk"));
  const allyToy = parseList(searchParams.get("allyToy"));
  const opponentToy = parseList(searchParams.get("opponentToy"));
  const tags = parseList(searchParams.get("tags"));
  const { versions } = await resolveVersionFilter(pool, searchParams.get("version"));

  const replayPlayerIdExpr = `coalesce(r.player_id, nullif(r.raw_json->>'UserId', ''))`;
  const replayOpponentIdExpr = `coalesce(r.opponent_id, nullif((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'UserId'), ''))`;
  const hiddenClause = hiddenReplayClause(replayPlayerIdExpr, replayOpponentIdExpr);
  const playerRankExpr = `coalesce(
    r.player_rank,
    case when ((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank') ~ '^[0-9]+$')
      then (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank')::int else null end
  )`;
  const opponentRankExpr = `coalesce(
    r.opponent_rank,
    case when ((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank') ~ '^[0-9]+$')
      then (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank')::int else null end
  )`;

  const values = [];
  let playerNameIndex = null;
  let playerIdExactIndex = null;
  let playerIdLikeIndex = null;
  const clauses = [
    `r.match_type != 'arena'`,
    `r.pack is not null`,
    `r.opponent_pack is not null`,
    hiddenClause,
    `r.pack != all($${values.length + 1})`,
    `r.opponent_pack != all($${values.length + 1})`
  ];
  values.push(EXCLUDED_PACKS);

  if (pack && opponentPack) {
    values.push(pack, opponentPack);
    const a = values.length - 1;
    const b = values.length;
    clauses.push(
      `((r.pack = $${a} and r.opponent_pack = $${b}) or (r.pack = $${b} and r.opponent_pack = $${a}))`
    );
  } else if (pack) {
    values.push(pack);
    clauses.push(`(r.pack = $${values.length} or r.opponent_pack = $${values.length})`);
  } else if (opponentPack) {
    values.push(opponentPack);
    clauses.push(`(r.pack = $${values.length} or r.opponent_pack = $${values.length})`);
  }
  if (excludePack) {
    values.push(excludePack);
    clauses.push(`(r.pack <> $${values.length} and r.opponent_pack <> $${values.length})`);
  }
  if (excludeMirrors) {
    clauses.push(`r.pack <> r.opponent_pack`);
  }
  if (winningPack) {
    values.push(winningPack);
    clauses.push(`(
      case
        when (select t.outcome from turns t where t.replay_id = r.id order by t.turn_number desc limit 1) = 1 then r.pack
        when (select t.outcome from turns t where t.replay_id = r.id order by t.turn_number desc limit 1) = 2 then r.opponent_pack
        else null
      end
    ) = $${values.length}`);
  }
  if (losingPack) {
    values.push(losingPack);
    clauses.push(`(
      case
        when (select t.outcome from turns t where t.replay_id = r.id order by t.turn_number desc limit 1) = 1 then r.opponent_pack
        when (select t.outcome from turns t where t.replay_id = r.id order by t.turn_number desc limit 1) = 2 then r.pack
        else null
      end
    ) = $${values.length}`);
  }
  if (minElo !== null || maxElo !== null) {
    let minEloIndex = null;
    let maxEloIndex = null;
    if (minElo !== null) {
      values.push(minElo);
      minEloIndex = values.length;
    }
    if (maxElo !== null) {
      values.push(maxElo);
      maxEloIndex = values.length;
    }
    const range = (expr) => {
      const parts = [];
      if (minEloIndex !== null) parts.push(`${expr} >= $${minEloIndex}`);
      if (maxEloIndex !== null) parts.push(`${expr} <= $${maxEloIndex}`);
      return `(${parts.join(" and ")})`;
    };
    clauses.push(`(${range(playerRankExpr)} or ${range(opponentRankExpr)})`);
  }
  if (player) {
    values.push(`%${player}%`);
    playerNameIndex = values.length;
    clauses.push(`(r.player_name ilike $${playerNameIndex} or r.opponent_name ilike $${playerNameIndex})`);
  }
  if (playerId) {
    values.push(playerId, `%${playerId}%`);
    playerIdExactIndex = values.length - 1;
    playerIdLikeIndex = values.length;
    clauses.push(`(
      r.player_id = $${playerIdExactIndex}
      or r.opponent_id = $${playerIdExactIndex}
      or (r.raw_json->>'UserId') = $${playerIdExactIndex}
      or coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${playerIdLikeIndex}
    )`);
  }
  if (tags.length) {
    values.push(tags);
    clauses.push(`coalesce(r.tags, '{}'::text[]) && $${values.length}`);
  }
  if (versions?.length) {
    values.push(versions);
    clauses.push(`r.game_version = any($${values.length})`);
  }

  const existsFilter = (list, side, column) => {
    if (!list.length) return "";
    values.push(list);
    return `and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = '${side}' and ap.${column} = any($${values.length}))`;
  };
  const allyOppFilters = [
    existsFilter(allyPet, "player", "pet_name"),
    existsFilter(opponentPet, "opponent", "pet_name"),
    existsFilter(allyPerk, "player", "perk"),
    existsFilter(opponentPerk, "opponent", "perk"),
    existsFilter(allyToy, "player", "toy"),
    existsFilter(opponentToy, "opponent", "toy")
  ].filter(Boolean).join("\n      ");

  const includePlayerParts = [];
  const includeOpponentParts = [];
  if (playerNameIndex !== null) {
    includePlayerParts.push(`r.player_name ilike $${playerNameIndex}`);
    includeOpponentParts.push(`r.opponent_name ilike $${playerNameIndex}`);
  }
  if (playerIdExactIndex !== null) {
    includePlayerParts.push(`coalesce(r.player_id, r.raw_json->>'UserId') = $${playerIdExactIndex}`);
    includeOpponentParts.push(`r.opponent_id = $${playerIdExactIndex}`);
  }
  if (playerIdLikeIndex !== null) {
    includeOpponentParts.push(`(
      r.opponent_id is null
      and coalesce(r.player_id, r.raw_json->>'UserId') is distinct from $${playerIdExactIndex}
      and coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${playerIdLikeIndex}
    )`);
  }
  const includePlayerSideExpr = includePlayerParts.length ? includePlayerParts.join(" and ") : "true";
  const includeOpponentSideExpr = includeOpponentParts.length ? includeOpponentParts.join(" and ") : "true";
  if (playerNameIndex !== null || playerIdExactIndex !== null) {
    clauses.push(`((${includePlayerSideExpr}) or (${includeOpponentSideExpr}))`);
  }

  values.push(petName);
  const petNameIndex = values.length;
  let petLevelClause = "";
  if (petLevel) {
    values.push(Number(petLevel));
    petLevelClause = `and p.level = $${values.length}`;
  }
  let turnRangeClause = "";
  if (minTurn !== null) {
    values.push(minTurn);
    turnRangeClause += ` and t.turn_number >= $${values.length}`;
  }
  if (maxTurn !== null) {
    values.push(maxTurn);
    turnRangeClause += ` and t.turn_number <= $${values.length}`;
  }

  const sql = `
    with base as (
      select
        r.id,
        (${includePlayerSideExpr}) as include_player_side,
        (${includeOpponentSideExpr}) as include_opponent_side
      from replays r
      where ${clauses.join(" and ")}
      ${allyOppFilters}
    ),
    pet_presence as (
      select distinct p.replay_id, p.side, p.turn_number
      from base b
      join pets p on p.replay_id = b.id
      where p.pet_name = $${petNameIndex} ${petLevelClause}
    ),
    pet_turn as (
      select
        t.turn_number,
        count(*)::int as rounds,
        sum(case when pp.side = 'player' and t.outcome = 1 then 1 when pp.side = 'opponent' and t.outcome = 2 then 1 else 0 end)::int as wins,
        sum(case when pp.side = 'player' and t.outcome = 2 then 1 when pp.side = 'opponent' and t.outcome = 1 then 1 else 0 end)::int as losses,
        sum((t.outcome = 3)::int)::int as draws
      from pet_presence pp
      join base b on b.id = pp.replay_id
      join turns t on t.replay_id = pp.replay_id and t.turn_number = pp.turn_number
      where ((pp.side = 'player' and b.include_player_side) or (pp.side = 'opponent' and b.include_opponent_side))
        ${turnRangeClause}
      group by t.turn_number
    )
    select coalesce(json_agg(row_to_json(x) order by x.turn_number asc), '[]'::json) as turns
    from pet_turn x
  `;

  const { rows } = await pool.query(sql, values);
  const payload = { petName, turns: rows[0]?.turns || [] };

  if (responseCache.size >= CACHE_MAX_KEYS) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(cacheKey, { timestamp: Date.now(), payload });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=120", "X-Cache": "MISS" }
  });
}
