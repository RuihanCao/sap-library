import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureHiddenPlayersTable, hiddenReplayClause } from "@/lib/hiddenPlayers";
import { resolveVersionFilter } from "@/lib/versionFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_KEYS = 200;
const globalForCache = globalThis;
const responseCache = globalForCache.__sapActionStatsCache || new Map();
if (!globalForCache.__sapActionStatsCache) {
  globalForCache.__sapActionStatsCache = responseCache;
}

function parseList(value) {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function parseIntOrNull(raw) {
  if (raw === null || raw === "" || !Number.isFinite(Number(raw))) return null;
  return Number(raw);
}

export async function GET(req) {
  await ensureHiddenPlayersTable(pool);

  const cacheKey = req.url;
  const cacheHit = responseCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cacheHit.payload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
        "X-Stats-Cache": "HIT"
      }
    });
  }

  const { searchParams } = new URL(req.url);
  const pack = searchParams.get("pack") || "";
  const opponentPack = searchParams.get("opponentPack") || "";
  const excludePack = searchParams.get("excludePack") || "";
  const excludeMirrors = searchParams.get("excludeMirrors") === "true";
  const player = searchParams.get("player") || "";
  const playerId = searchParams.get("playerId") || "";
  const minElo = parseIntOrNull(searchParams.get("minElo"));
  const maxElo = parseIntOrNull(searchParams.get("maxElo"));
  const minSampleRaw = parseIntOrNull(searchParams.get("minSample"));
  const minSample = minSampleRaw !== null ? Math.max(0, minSampleRaw) : 10;
  const tags = parseList(searchParams.get("tags"));
  const { versions } = await resolveVersionFilter(pool, searchParams.get("version"));

  const replayPlayerIdExpr = `coalesce(r.player_id, nullif(r.raw_json->>'UserId', ''))`;
  const replayOpponentIdExpr = `coalesce(r.opponent_id, nullif((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'UserId'), ''))`;
  const hiddenClause = hiddenReplayClause(replayPlayerIdExpr, replayOpponentIdExpr);
  const playerRankExpr = `coalesce(
    r.player_rank,
    case
      when ((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank') ~ '^[0-9]+$')
        then (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank')::int
      else null
    end
  )`;

  const values = [];
  const clauses = [
    `r.match_type != 'arena'`,
    `r.pack is not null`,
    `r.opponent_pack is not null`,
    hiddenClause,
    `r.pack != all($${values.length + 1})`,
    `r.opponent_pack != all($${values.length + 1})`
  ];
  values.push(EXCLUDED_PACKS);

  if (pack) {
    values.push(pack);
    clauses.push(`r.pack = $${values.length}`);
  }
  if (opponentPack) {
    values.push(opponentPack);
    clauses.push(`r.opponent_pack = $${values.length}`);
  }
  if (excludePack) {
    values.push(excludePack);
    clauses.push(`(r.pack <> $${values.length} and r.opponent_pack <> $${values.length})`);
  }
  if (excludeMirrors) {
    clauses.push(`r.pack <> r.opponent_pack`);
  }
  if (player) {
    values.push(`%${player}%`);
    clauses.push(`r.player_name ilike $${values.length}`);
  }
  if (playerId) {
    values.push(playerId);
    clauses.push(`(${replayPlayerIdExpr}) = $${values.length}`);
  }
  if (minElo !== null) {
    values.push(minElo);
    clauses.push(`${playerRankExpr} >= $${values.length}`);
  }
  if (maxElo !== null) {
    values.push(maxElo);
    clauses.push(`${playerRankExpr} <= $${values.length}`);
  }
  if (tags.length) {
    values.push(tags);
    clauses.push(`coalesce(r.tags, '{}'::text[]) && $${values.length}`);
  }
  if (versions?.length) {
    values.push(versions);
    clauses.push(`r.game_version = any($${values.length})`);
  }

  values.push(minSample);
  const minSampleIdx = values.length;

  // Player-POV action aggregates. Every `actions` row belongs to the replay
  // owner, so winrate uses the player's own game result (last-turn outcome).
  const sql = `
    with base as (
      select r.id from replays r where ${clauses.join(" and ")}
    ),
    go as (
      select b.id as replay_id,
        (select t.outcome from turns t where t.replay_id = b.id order by t.turn_number desc limit 1) as outcome
      from base b
    ),
    act as (
      select a.action_type, a.pet_name, a.food_name, a.replay_id, g.outcome
      from actions a
      join go g on g.replay_id = a.replay_id
    ),
    buy_agg as (
      select
        pet_name,
        count(*) filter (where action_type in ('buy','buy_merge'))::int as total_buys,
        count(distinct replay_id) filter (where action_type in ('buy','buy_merge'))::int as games_bought,
        count(distinct replay_id) filter (where action_type in ('buy','buy_merge') and outcome = 1)::int as wins_bought,
        count(distinct replay_id) filter (where action_type in ('buy','buy_merge') and outcome = 3)::int as draws_bought
      from act
      where pet_name is not null
      group by pet_name
    ),
    sell_agg as (
      select
        pet_name,
        count(*) filter (where action_type = 'sell')::int as total_sells,
        count(distinct replay_id) filter (where action_type = 'sell')::int as games_sold
      from act
      where pet_name is not null
      group by pet_name
    ),
    churn_agg as (
      select pet_name, count(*)::int as games_churned
      from (
        select pet_name, replay_id from act where action_type in ('buy','buy_merge')
        intersect
        select pet_name, replay_id from act where action_type = 'sell'
      ) c
      group by pet_name
    ),
    pet_action_stats as (
      select
        coalesce(b.pet_name, s.pet_name) as pet_name,
        coalesce(b.total_buys, 0) as total_buys,
        coalesce(b.games_bought, 0) as games_bought,
        coalesce(b.wins_bought, 0) as wins_bought,
        coalesce(b.draws_bought, 0) as draws_bought,
        coalesce(s.total_sells, 0) as total_sells,
        coalesce(s.games_sold, 0) as games_sold,
        coalesce(c.games_churned, 0) as games_churned
      from buy_agg b
      full outer join sell_agg s on s.pet_name = b.pet_name
      left join churn_agg c on c.pet_name = coalesce(b.pet_name, s.pet_name)
    ),
    food_pet_agg as (
      select
        pet_name,
        count(*)::int as times_fed,
        count(distinct replay_id)::int as games_fed,
        count(distinct replay_id) filter (where outcome = 1)::int as wins_fed,
        count(distinct replay_id) filter (where outcome = 3)::int as draws_fed
      from act
      where action_type = 'food' and pet_name is not null
      group by pet_name
    ),
    food_name_agg as (
      select
        food_name,
        count(*)::int as uses,
        count(distinct replay_id)::int as games,
        count(distinct replay_id) filter (where outcome = 1)::int as wins,
        count(distinct replay_id) filter (where outcome = 3)::int as draws
      from act
      where action_type = 'food' and food_name is not null
      group by food_name
    )
    select
      (select count(*) from base)::int as total_games,
      (select count(*) from act)::int as total_actions,
      (select count(*) from act where action_type in ('buy','buy_merge'))::int as total_buys,
      (select count(*) from act where action_type = 'sell')::int as total_sells,
      (select count(*) from act where action_type = 'merge')::int as total_merges,
      (select count(*) from act where action_type = 'food')::int as total_foods,
      (select count(*) from act where action_type = 'food' and food_name is not null)::int as named_foods,
      (select coalesce(json_agg(row_to_json(ps) order by ps.games_bought desc, ps.pet_name asc), '[]'::json)
         from pet_action_stats ps where ps.games_bought >= $${minSampleIdx} or ps.games_sold >= $${minSampleIdx}) as pet_action_stats,
      (select coalesce(json_agg(row_to_json(fp) order by fp.games_fed desc, fp.pet_name asc), '[]'::json)
         from food_pet_agg fp where fp.games_fed >= $${minSampleIdx}) as food_pet_stats,
      (select coalesce(json_agg(row_to_json(fn) order by fn.uses desc, fn.food_name asc), '[]'::json)
         from food_name_agg fn) as food_name_stats
  `;

  const { rows } = await pool.query(sql, values);
  const row = rows[0] || {};

  const payload = {
    totalGames: Number(row.total_games || 0),
    totalActions: Number(row.total_actions || 0),
    generatedAt: new Date().toISOString(),
    summary: {
      totalBuys: Number(row.total_buys || 0),
      totalSells: Number(row.total_sells || 0),
      totalMerges: Number(row.total_merges || 0),
      totalFoods: Number(row.total_foods || 0),
      namedFoods: Number(row.named_foods || 0)
    },
    petActionStats: row.pet_action_stats || [],
    foodPetStats: row.food_pet_stats || [],
    foodNameStats: row.food_name_stats || []
  };

  if (responseCache.size >= CACHE_MAX_KEYS) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(cacheKey, { timestamp: Date.now(), payload });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      "X-Stats-Cache": "MISS"
    }
  });
}
