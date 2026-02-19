import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureHiddenPlayersTable, hiddenReplayClause } from "@/lib/hiddenPlayers";
import { resolveVersionFilter } from "@/lib/versionFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];
const STATS_CACHE_TTL_MS = 30_000;
const STATS_CACHE_MAX_KEYS = 200;
const globalForStatsCache = globalThis;
const statsResponseCache = globalForStatsCache.__sapStatsCache || new Map();
if (!globalForStatsCache.__sapStatsCache) {
  globalForStatsCache.__sapStatsCache = statsResponseCache;
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req) {
  await ensureHiddenPlayersTable(pool);
  const cacheKey = req.url;
  const cacheHit = statsResponseCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.timestamp < STATS_CACHE_TTL_MS) {
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
  const winningPack = searchParams.get("winningPack") || "";
  const losingPack = searchParams.get("losingPack") || "";
  const excludePack = searchParams.get("excludePack") || "";
  const excludeMirrors = searchParams.get("excludeMirrors") === "true";
  const player = searchParams.get("player") || "";
  const playerId = searchParams.get("playerId") || "";
  const minEloRaw = searchParams.get("minElo");
  const maxEloRaw = searchParams.get("maxElo");
  const minElo = minEloRaw !== null && minEloRaw !== "" && Number.isFinite(Number(minEloRaw))
    ? Number(minEloRaw)
    : null;
  const maxElo = maxEloRaw !== null && maxEloRaw !== "" && Number.isFinite(Number(maxEloRaw))
    ? Number(maxEloRaw)
    : null;
  const minSampleRaw = searchParams.get("minSample");
  const minSample = minSampleRaw !== null && minSampleRaw !== "" && Number.isFinite(Number(minSampleRaw))
    ? Math.max(0, Number(minSampleRaw))
    : 10;
  const minEndOnRaw = searchParams.get("minEndOn");
  const minEndOn = minEndOnRaw !== null && minEndOnRaw !== "" && Number.isFinite(Number(minEndOnRaw))
    ? Math.max(0, Number(minEndOnRaw))
    : null;
  const minTurnRaw = searchParams.get("minTurn");
  const maxTurnRaw = searchParams.get("maxTurn");
  const minTurn = minTurnRaw !== null && minTurnRaw !== "" && Number.isFinite(Number(minTurnRaw))
    ? Number(minTurnRaw)
    : null;
  const maxTurn = maxTurnRaw !== null && maxTurnRaw !== "" && Number.isFinite(Number(maxTurnRaw))
    ? Number(maxTurnRaw)
    : null;
  const pet = parseList(searchParams.get("pet"));
  const petLevel = searchParams.get("petLevel") || "";
  const perk = parseList(searchParams.get("perk"));
  const toy = parseList(searchParams.get("toy"));
  const allyPet = parseList(searchParams.get("allyPet"));
  const opponentPet = parseList(searchParams.get("opponentPet"));
  const allyPerk = parseList(searchParams.get("allyPerk"));
  const opponentPerk = parseList(searchParams.get("opponentPerk"));
  const allyToy = parseList(searchParams.get("allyToy"));
  const opponentToy = parseList(searchParams.get("opponentToy"));
  const scope = searchParams.get("scope") || "game";
  const tags = parseList(searchParams.get("tags"));
  const versionFilterRaw = searchParams.get("version");
  const { versions } = await resolveVersionFilter(pool, versionFilterRaw);
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
  const opponentRankExpr = `coalesce(
    r.opponent_rank,
    case
      when ((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank') ~ '^[0-9]+$')
        then (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank')::int
      else null
    end
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
    const buildRankRangeClause = (expr) => {
      const parts = [];
      if (minEloIndex !== null) parts.push(`${expr} >= $${minEloIndex}`);
      if (maxEloIndex !== null) parts.push(`${expr} <= $${maxEloIndex}`);
      return `(${parts.join(" and ")})`;
    };
    clauses.push(`(${buildRankRangeClause(playerRankExpr)} or ${buildRankRangeClause(opponentRankExpr)})`);
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

  const petClause = pet.length ? "and p.pet_name = any($PET)" : "";
  const petLevelClause = petLevel ? "and p.level = $PET_LEVEL" : "";
  const perkClause = perk.length ? "and p.perk = any($PERK)" : "";
  const toyClause = toy.length ? "and p.toy = any($TOY)" : "";
  const minEndOnPetClause = minEndOn !== null ? " and ps.games_end >= $MIN_END_ON" : "";
  const minEndOnPerkClause = minEndOn !== null ? " and ps.games_end >= $MIN_END_ON" : "";
  const minEndOnToyClause = minEndOn !== null ? " and ts.games_end >= $MIN_END_ON" : "";

  const allyPetFilter = allyPet.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.pet_name = any($ALLY_PET))"
    : "";
  const opponentPetFilter = opponentPet.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.pet_name = any($OPP_PET))"
    : "";
  const allyPerkFilter = allyPerk.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.perk = any($ALLY_PERK))"
    : "";
  const opponentPerkFilter = opponentPerk.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.perk = any($OPP_PERK))"
    : "";
  const allyToyFilter = allyToy.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.toy = any($ALLY_TOY))"
    : "";
  const opponentToyFilter = opponentToy.length
    ? "and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.toy = any($OPP_TOY))"
    : "";

  const allyPetTurnFilter = allyPet.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.pet_name = any($ALLY_PET))"
    : "";
  const opponentPetTurnFilter = opponentPet.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.pet_name = any($OPP_PET))"
    : "";
  const allyPerkTurnFilter = allyPerk.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.perk = any($ALLY_PERK))"
    : "";
  const opponentPerkTurnFilter = opponentPerk.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.perk = any($OPP_PERK))"
    : "";
  const allyToyTurnFilter = allyToy.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.toy = any($ALLY_TOY))"
    : "";
  const opponentToyTurnFilter = opponentToy.length
    ? "and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.toy = any($OPP_TOY))"
    : "";
  const battleTurnMinClause = minTurn !== null ? "and t.turn_number >= $MIN_TURN" : "";
  const battleTurnMaxClause = maxTurn !== null ? "and t.turn_number <= $MAX_TURN" : "";

  const includePlayerSideExprParts = [];
  const includeOpponentSideExprParts = [];
  if (playerNameIndex !== null) {
    includePlayerSideExprParts.push(`r.player_name ilike $${playerNameIndex}`);
    includeOpponentSideExprParts.push(`r.opponent_name ilike $${playerNameIndex}`);
  }
  if (playerIdExactIndex !== null) {
    includePlayerSideExprParts.push(`coalesce(r.player_id, r.raw_json->>'UserId') = $${playerIdExactIndex}`);
  }
  if (playerIdLikeIndex !== null) {
    includeOpponentSideExprParts.push(`(
      r.opponent_id = $${playerIdExactIndex}
      or coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${playerIdLikeIndex}
    )`);
  }

  const includePlayerSideExpr = includePlayerSideExprParts.length
    ? includePlayerSideExprParts.join(" and ")
    : "true";
  const includeOpponentSideExpr = includeOpponentSideExprParts.length
    ? includeOpponentSideExprParts.join(" and ")
    : "true";

  if (playerNameIndex !== null || playerIdExactIndex !== null || playerIdLikeIndex !== null) {
    clauses.push(`((${includePlayerSideExpr}) or (${includeOpponentSideExpr}))`);
  }

  const baseSql = `
    with base as (
      select
        r.id,
        r.pack,
        r.opponent_pack,
        r.match_type,
        ${playerRankExpr} as player_rank,
        ${opponentRankExpr} as opponent_rank,
        (r.pack = r.opponent_pack) as is_mirror,
        r.created_at,
        (${includePlayerSideExpr}) as include_player_side,
        (${includeOpponentSideExpr}) as include_opponent_side
      from replays r
      where ${clauses.join(" and ")}
      ${allyPetFilter}
      ${opponentPetFilter}
      ${allyPerkFilter}
      ${opponentPerkFilter}
      ${allyToyFilter}
      ${opponentToyFilter}
    ),
    last_turn as (
      select t.replay_id, max(t.turn_number) as max_turn
      from turns t
      group by t.replay_id
    ),
    outcomes as (
      select t.replay_id, t.outcome
      from turns t
      join last_turn lt on lt.replay_id = t.replay_id and lt.max_turn = t.turn_number
    ),
    pet_any as (
      select distinct b.id, p.pet_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' ${petClause} ${petLevelClause}
    ),
    pet_end as (
      select distinct b.id, p.pet_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' ${petClause} ${petLevelClause}
    ),
    opp_pet_any as (
      select distinct b.id, p.pet_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' ${petClause} ${petLevelClause}
    ),
    opp_pet_end as (
      select distinct b.id, p.pet_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' ${petClause} ${petLevelClause}
    ),
    perk_any as (
      select distinct b.id, p.perk as perk_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' and p.perk is not null ${perkClause}
    ),
    perk_end as (
      select distinct b.id, p.perk as perk_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' and p.perk is not null ${perkClause}
    ),
    opp_perk_any as (
      select distinct b.id, p.perk as perk_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' and p.perk is not null ${perkClause}
    ),
    opp_perk_end as (
      select distinct b.id, p.perk as perk_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' and p.perk is not null ${perkClause}
    ),
    toy_any as (
      select distinct b.id, p.toy as toy_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' and p.toy is not null ${toyClause}
    ),
    toy_end as (
      select distinct b.id, p.toy as toy_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' and p.toy is not null ${toyClause}
    ),
    opp_toy_any as (
      select distinct b.id, p.toy as toy_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' and p.toy is not null ${toyClause}
    ),
    opp_toy_end as (
      select distinct b.id, p.toy as toy_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' and p.toy is not null ${toyClause}
    ),
    pet_list as (
      select distinct pet_name from pet_any
      union
      select distinct pet_name from pet_end
    ),
    opp_pet_list as (
      select distinct pet_name from opp_pet_any
      union
      select distinct pet_name from opp_pet_end
    ),
    perk_list as (
      select distinct perk_name from perk_any
      union
      select distinct perk_name from perk_end
    ),
    opp_perk_list as (
      select distinct perk_name from opp_perk_any
      union
      select distinct perk_name from opp_perk_end
    ),
    toy_list as (
      select distinct toy_name from toy_any
      union
      select distinct toy_name from toy_end
    ),
    opp_toy_list as (
      select distinct toy_name from opp_toy_any
      union
      select distinct toy_name from opp_toy_end
    ),
    combined_pack as (
      select
        b.id,
        b.pack as pack,
        o.outcome as outcome,
        b.is_mirror,
        'player'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
      where b.include_player_side
      union all
      select
        b.id,
        b.opponent_pack as pack,
        o.outcome as outcome,
        b.is_mirror,
        'opponent'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
      where b.include_opponent_side
    ),
    matchup_source as (
      select
        b.id,
        case when b.pack <= b.opponent_pack then b.pack else b.opponent_pack end as pack,
        case when b.pack <= b.opponent_pack then b.opponent_pack else b.pack end as opponent_pack,
        case
          when b.pack <= b.opponent_pack and o.outcome = 1 then 1
          when b.pack > b.opponent_pack and o.outcome = 2 then 1
          else 0
        end::int as canonical_wins,
        (o.outcome = 3)::int as canonical_draws,
        b.is_mirror
      from base b
      join outcomes o on o.replay_id = b.id
      where b.include_player_side or b.include_opponent_side
    ),
    combined_pet_any as (
      select pa.id, pa.pet_name, 'player'::text as side
      from pet_any pa
      join base b on b.id = pa.id
      where b.include_player_side
      union all
      select pa.id, pa.pet_name, 'opponent'::text as side
      from opp_pet_any pa
      join base b on b.id = pa.id
      where b.include_opponent_side
    ),
    combined_pet_end as (
      select pe.id, pe.pet_name, 'player'::text as side
      from pet_end pe
      join base b on b.id = pe.id
      where b.include_player_side
      union all
      select pe.id, pe.pet_name, 'opponent'::text as side
      from opp_pet_end pe
      join base b on b.id = pe.id
      where b.include_opponent_side
    ),
    combined_pet_list as (
      select distinct pet_name from combined_pet_any
      union
      select distinct pet_name from combined_pet_end
    ),
    combined_perk_any as (
      select pa.id, pa.perk_name, 'player'::text as side
      from perk_any pa
      join base b on b.id = pa.id
      where b.include_player_side
      union all
      select pa.id, pa.perk_name, 'opponent'::text as side
      from opp_perk_any pa
      join base b on b.id = pa.id
      where b.include_opponent_side
    ),
    combined_perk_end as (
      select pe.id, pe.perk_name, 'player'::text as side
      from perk_end pe
      join base b on b.id = pe.id
      where b.include_player_side
      union all
      select pe.id, pe.perk_name, 'opponent'::text as side
      from opp_perk_end pe
      join base b on b.id = pe.id
      where b.include_opponent_side
    ),
    combined_perk_list as (
      select distinct perk_name from combined_perk_any
      union
      select distinct perk_name from combined_perk_end
    ),
    combined_toy_any as (
      select ta.id, ta.toy_name, 'player'::text as side
      from toy_any ta
      join base b on b.id = ta.id
      where b.include_player_side
      union all
      select ta.id, ta.toy_name, 'opponent'::text as side
      from opp_toy_any ta
      join base b on b.id = ta.id
      where b.include_opponent_side
    ),
    combined_toy_end as (
      select te.id, te.toy_name, 'player'::text as side
      from toy_end te
      join base b on b.id = te.id
      where b.include_player_side
      union all
      select te.id, te.toy_name, 'opponent'::text as side
      from opp_toy_end te
      join base b on b.id = te.id
      where b.include_opponent_side
    ),
    combined_toy_list as (
      select distinct toy_name from combined_toy_any
      union
      select distinct toy_name from combined_toy_end
    ),
    pack_rank_agg as (
      select
        pr.pack,
        avg(pr.rank::float8) as avg_rank
      from (
        select b.pack as pack, b.player_rank as rank
        from base b
        where b.include_player_side
          and b.match_type != 'private'
          and b.player_rank is not null

        union all

        select b.opponent_pack as pack, b.opponent_rank as rank
        from base b
        where b.include_opponent_side
          and b.match_type != 'private'
          and b.opponent_rank is not null
      ) pr
      group by pr.pack
    ),
    pack_game_length_agg as (
      select
        cp.pack,
        avg(coalesce(lt.max_turn, 0)::float8)::float8 as avg_game_length
      from combined_pack cp
      join last_turn lt on lt.replay_id = cp.id
      group by cp.pack
    ),
    pack_stats_agg as (
      select
        cp.pack as pack,
        count(*)::int as games,
        sum(case
          when cp.side = 'player' and cp.outcome = 1 then 1
          when cp.side = 'opponent' and cp.outcome = 2 then 1
          else 0
        end)::int as wins,
        sum((cp.outcome = 3)::int)::int as draws,
        sum((not cp.is_mirror)::int)::int as rate_games,
        sum(case
          when cp.is_mirror then 0
          when cp.side = 'player' and cp.outcome = 1 then 1
          when cp.side = 'opponent' and cp.outcome = 2 then 1
          else 0
        end)::int as rate_wins,
        sum(case when (not cp.is_mirror) and cp.outcome = 3 then 1 else 0 end)::int as rate_draws,
        pra.avg_rank,
        pgl.avg_game_length
      from combined_pack cp
      left join pack_rank_agg pra on pra.pack = cp.pack
      left join pack_game_length_agg pgl on pgl.pack = cp.pack
      group by cp.pack, pra.avg_rank, pgl.avg_game_length
    ),
    matchup_stats_agg as (
      select
        ms.pack,
        ms.opponent_pack,
        count(*)::int as games,
        sum(ms.canonical_wins)::int as wins,
        sum(ms.canonical_draws)::int as draws,
        sum((not ms.is_mirror)::int)::int as rate_games,
        sum(case when ms.is_mirror then 0 else ms.canonical_wins end)::int as rate_wins,
        sum(case when (not ms.is_mirror) then ms.canonical_draws else 0 end)::int as rate_draws,
        avg(coalesce(lt.max_turn, 0)::float8)::float8 as avg_game_length
      from matchup_source ms
      join last_turn lt on lt.replay_id = ms.id
      group by ms.pack, ms.opponent_pack
    ),
    pet_any_agg as (
      select
        pa.pet_name,
        count(*)::int as games_with,
        sum(case
          when pa.side = 'player' and o.outcome = 1 then 1
          when pa.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_with,
        sum((o.outcome = 3)::int)::int as draws_with
      from combined_pet_any pa
      join outcomes o on o.replay_id = pa.id
      group by pa.pet_name
    ),
    pet_end_agg as (
      select
        pe.pet_name,
        count(*)::int as games_end,
        sum(case
          when pe.side = 'player' and o.outcome = 1 then 1
          when pe.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_end,
        sum((o.outcome = 3)::int)::int as draws_end
      from combined_pet_end pe
      join outcomes o on o.replay_id = pe.id
      group by pe.pet_name
    ),
    pet_stats_agg as (
      select
        coalesce(pa.pet_name, pe.pet_name) as pet_name,
        coalesce(pa.games_with, 0)::int as games_with,
        coalesce(pa.wins_with, 0)::int as wins_with,
        coalesce(pa.draws_with, 0)::int as draws_with,
        coalesce(pe.games_end, 0)::int as games_end,
        coalesce(pe.wins_end, 0)::int as wins_end,
        coalesce(pe.draws_end, 0)::int as draws_end
      from pet_any_agg pa
      full outer join pet_end_agg pe on pe.pet_name = pa.pet_name
    ),
    perk_any_agg as (
      select
        pa.perk_name,
        count(*)::int as games_with,
        sum(case
          when pa.side = 'player' and o.outcome = 1 then 1
          when pa.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_with,
        sum((o.outcome = 3)::int)::int as draws_with
      from combined_perk_any pa
      join outcomes o on o.replay_id = pa.id
      group by pa.perk_name
    ),
    perk_end_agg as (
      select
        pe.perk_name,
        count(*)::int as games_end,
        sum(case
          when pe.side = 'player' and o.outcome = 1 then 1
          when pe.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_end,
        sum((o.outcome = 3)::int)::int as draws_end
      from combined_perk_end pe
      join outcomes o on o.replay_id = pe.id
      group by pe.perk_name
    ),
    perk_stats_agg as (
      select
        coalesce(pa.perk_name, pe.perk_name) as perk_name,
        coalesce(pa.games_with, 0)::int as games_with,
        coalesce(pa.wins_with, 0)::int as wins_with,
        coalesce(pa.draws_with, 0)::int as draws_with,
        coalesce(pe.games_end, 0)::int as games_end,
        coalesce(pe.wins_end, 0)::int as wins_end,
        coalesce(pe.draws_end, 0)::int as draws_end
      from perk_any_agg pa
      full outer join perk_end_agg pe on pe.perk_name = pa.perk_name
    ),
    toy_any_agg as (
      select
        ta.toy_name,
        count(*)::int as games_with,
        sum(case
          when ta.side = 'player' and o.outcome = 1 then 1
          when ta.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_with,
        sum((o.outcome = 3)::int)::int as draws_with
      from combined_toy_any ta
      join outcomes o on o.replay_id = ta.id
      group by ta.toy_name
    ),
    toy_end_agg as (
      select
        te.toy_name,
        count(*)::int as games_end,
        sum(case
          when te.side = 'player' and o.outcome = 1 then 1
          when te.side = 'opponent' and o.outcome = 2 then 1
          else 0
        end)::int as wins_end,
        sum((o.outcome = 3)::int)::int as draws_end
      from combined_toy_end te
      join outcomes o on o.replay_id = te.id
      group by te.toy_name
    ),
    toy_stats_agg as (
      select
        coalesce(ta.toy_name, te.toy_name) as toy_name,
        coalesce(ta.games_with, 0)::int as games_with,
        coalesce(ta.wins_with, 0)::int as wins_with,
        coalesce(ta.draws_with, 0)::int as draws_with,
        coalesce(te.games_end, 0)::int as games_end,
        coalesce(te.wins_end, 0)::int as wins_end,
        coalesce(te.draws_end, 0)::int as draws_end
      from toy_any_agg ta
      full outer join toy_end_agg te on te.toy_name = ta.toy_name
    )
    select
      (select count(*) from base) as total_games,
      (select count(*) from turns t join base b on b.id = t.replay_id) as total_battles,
      (select max(created_at) from base) as newest_entry_at,
      (select coalesce(json_agg(row_to_json(ps) order by ps.pack), '[]'::json) from pack_stats_agg ps where ps.rate_games >= $MIN_SAMPLE_SIZE) as pack_stats,
      (select coalesce(json_agg(row_to_json(ms) order by ms.games desc, ms.pack asc, ms.opponent_pack asc), '[]'::json) from matchup_stats_agg ms where ms.rate_games >= $MIN_SAMPLE_SIZE or ms.pack = ms.opponent_pack) as matchup_stats,
      (select coalesce(json_agg(row_to_json(ps) order by ps.games_with desc, ps.pet_name asc), '[]'::json) from pet_stats_agg ps where true${minEndOnPetClause}) as pet_stats,
      (select coalesce(json_agg(row_to_json(ps) order by ps.games_with desc, ps.perk_name asc), '[]'::json) from perk_stats_agg ps where true${minEndOnPerkClause}) as perk_stats,
      (select coalesce(json_agg(row_to_json(ts) order by ts.games_with desc, ts.toy_name asc), '[]'::json) from toy_stats_agg ts where true${minEndOnToyClause}) as toy_stats
  `;

  const battleSql = `
    with base as (
      select
        r.id,
        r.pack,
        r.opponent_pack,
        r.match_type,
        ${playerRankExpr} as player_rank,
        ${opponentRankExpr} as opponent_rank,
        (r.pack = r.opponent_pack) as is_mirror,
        r.created_at,
        (${includePlayerSideExpr}) as include_player_side,
        (${includeOpponentSideExpr}) as include_opponent_side
      from replays r
      where ${clauses.join(" and ")}
    ),
    turns_base as (
      select t.id as turn_id, t.replay_id, t.turn_number, t.outcome
      from turns t
      join base b on b.id = t.replay_id
      where 1=1
      ${battleTurnMinClause}
      ${battleTurnMaxClause}
      ${allyPetTurnFilter}
      ${opponentPetTurnFilter}
      ${allyPerkTurnFilter}
      ${opponentPerkTurnFilter}
      ${allyToyTurnFilter}
      ${opponentToyTurnFilter}
    ),
    replay_lengths as (
      select
        tr.replay_id,
        max(t.turn_number)::int as game_length
      from (select distinct replay_id from turns_base) tr
      join turns t on t.replay_id = tr.replay_id
      group by tr.replay_id
    ),
    pack_rounds as (
      select tb.turn_id, b.pack as pack, 'player'::text as side, tb.outcome, b.is_mirror
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_player_side
      union all
      select tb.turn_id, b.opponent_pack as pack, 'opponent'::text as side, tb.outcome, b.is_mirror
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_opponent_side
    ),
    pack_games as (
      select distinct tb.replay_id, b.pack as pack
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_player_side

      union

      select distinct tb.replay_id, b.opponent_pack as pack
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_opponent_side
    ),
    matchup_rounds as (
      select
        tb.turn_id,
        tb.replay_id,
        case when b.pack <= b.opponent_pack then b.pack else b.opponent_pack end as pack,
        case when b.pack <= b.opponent_pack then b.opponent_pack else b.pack end as opponent_pack,
        case
          when b.pack <= b.opponent_pack and tb.outcome = 1 then 1
          when b.pack > b.opponent_pack and tb.outcome = 2 then 1
          else 0
        end::int as canonical_wins,
        (tb.outcome = 3)::int as canonical_draws,
        b.is_mirror
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_player_side or b.include_opponent_side
    ),
    matchup_games as (
      select distinct
        tb.replay_id,
        case when b.pack <= b.opponent_pack then b.pack else b.opponent_pack end as pack,
        case when b.pack <= b.opponent_pack then b.opponent_pack else b.pack end as opponent_pack
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_player_side or b.include_opponent_side
    ),
    pet_rounds as (
      select
        tb.turn_id,
        p.pet_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      join base b on b.id = tb.replay_id
      where p.pet_name is not null ${petClause} ${petLevelClause}
      and ((p.side = 'player' and b.include_player_side) or (p.side = 'opponent' and b.include_opponent_side))
      group by tb.turn_id, p.pet_name, tb.outcome, p.side
    ),
    perk_rounds as (
      select
        tb.turn_id,
        p.perk as perk_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      join base b on b.id = tb.replay_id
      where p.perk is not null ${perkClause}
      and ((p.side = 'player' and b.include_player_side) or (p.side = 'opponent' and b.include_opponent_side))
      group by tb.turn_id, p.perk, tb.outcome, p.side
    ),
    toy_rounds as (
      select
        tb.turn_id,
        p.toy as toy_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      join base b on b.id = tb.replay_id
      where p.toy is not null ${toyClause}
      and ((p.side = 'player' and b.include_player_side) or (p.side = 'opponent' and b.include_opponent_side))
      group by tb.turn_id, p.toy, tb.outcome, p.side
    ),
    pack_rank_agg as (
      select
        pr.pack,
        avg(pr.rank::float8) as avg_rank
      from (
        select b.pack as pack, b.player_rank as rank
        from base b
        where b.include_player_side
          and b.match_type != 'private'
          and b.player_rank is not null

        union all

        select b.opponent_pack as pack, b.opponent_rank as rank
        from base b
        where b.include_opponent_side
          and b.match_type != 'private'
          and b.opponent_rank is not null
      ) pr
      group by pr.pack
    ),
    pack_game_lengths as (
      select
        pg.pack,
        avg(coalesce(rl.game_length, 0)::float8)::float8 as avg_game_length
      from pack_games pg
      join replay_lengths rl on rl.replay_id = pg.replay_id
      group by pg.pack
    ),
    matchup_game_lengths as (
      select
        mg.pack,
        mg.opponent_pack,
        avg(coalesce(rl.game_length, 0)::float8)::float8 as avg_game_length
      from matchup_games mg
      join replay_lengths rl on rl.replay_id = mg.replay_id
      group by mg.pack, mg.opponent_pack
    )
    select
      (select count(*) from turns_base) as total_games,
      (select count(*) from turns_base) as total_battles,
      (select max(created_at) from base) as newest_entry_at,
      (select coalesce(json_agg(row_to_json(cps)), '[]'::json) from (
        select
          pr.pack as pack,
          count(*)::int as games,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws,
          sum((not pr.is_mirror)::int)::int as rate_games,
          sum(case
            when pr.is_mirror then 0
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as rate_wins,
          sum(case when (not pr.is_mirror) and pr.outcome = 3 then 1 else 0 end)::int as rate_draws,
          pra.avg_rank,
          pgl.avg_game_length
        from pack_rounds pr
        left join pack_rank_agg pra on pra.pack = pr.pack
        left join pack_game_lengths pgl on pgl.pack = pr.pack
        group by pr.pack, pra.avg_rank, pgl.avg_game_length
        having sum((not pr.is_mirror)::int) >= $MIN_SAMPLE_SIZE
        order by pr.pack
      ) cps) as pack_stats,
      (select coalesce(json_agg(row_to_json(matchup_stats)), '[]'::json) from (
        select
          mr.pack as pack,
          mr.opponent_pack as opponent_pack,
          count(*)::int as games,
          sum(mr.canonical_wins)::int as wins,
          sum(mr.canonical_draws)::int as draws,
          sum((not mr.is_mirror)::int)::int as rate_games,
          sum(case when mr.is_mirror then 0 else mr.canonical_wins end)::int as rate_wins,
          sum(case when (not mr.is_mirror) then mr.canonical_draws else 0 end)::int as rate_draws,
          mgl.avg_game_length
        from matchup_rounds mr
        left join matchup_game_lengths mgl on mgl.pack = mr.pack and mgl.opponent_pack = mr.opponent_pack
        group by mr.pack, mr.opponent_pack, mgl.avg_game_length
        having sum((not mr.is_mirror)::int) >= $MIN_SAMPLE_SIZE
          or mr.pack = mr.opponent_pack
        order by count(*) desc, mr.pack asc, mr.opponent_pack asc
      ) matchup_stats) as matchup_stats,
      (select coalesce(json_agg(row_to_json(pet_stats)), '[]'::json) from (
        select
          pr.pet_name as pet_name,
          count(*)::int as games_with,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws_with
        from pet_rounds pr
        group by pr.pet_name
        order by count(*) desc, pr.pet_name asc
      ) pet_stats) as pet_stats,
      (select coalesce(json_agg(row_to_json(perk_stats)), '[]'::json) from (
        select
          pr.perk_name as perk_name,
          count(*)::int as games_with,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws_with
        from perk_rounds pr
        group by pr.perk_name
        order by count(*) desc, pr.perk_name asc
      ) perk_stats) as perk_stats,
      (select coalesce(json_agg(row_to_json(toy_stats)), '[]'::json) from (
        select
          tr.toy_name as toy_name,
          count(*)::int as games_with,
          sum(case
            when tr.side = 'player' and tr.outcome = 1 then 1
            when tr.side = 'opponent' and tr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when tr.outcome = 3 then 1 else 0 end)::int as draws_with
        from toy_rounds tr
        group by tr.toy_name
        order by count(*) desc, tr.toy_name asc
      ) toy_stats) as toy_stats
  `;

  let sql = scope === "battle" ? battleSql : baseSql;
  let finalValues = values.slice();
  const bindToken = (token, value) => {
    if (!value || !sql.includes(token)) return;
    const index = finalValues.length + 1;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sql = sql.replace(new RegExp(escaped, "g"), `$${index}`);
    finalValues.push(value);
  };

  if (petLevel) {
    const levelIndex = finalValues.length + 1;
    sql = sql.replace(/\$PET_LEVEL/g, `$${levelIndex}`);
    finalValues.push(Number(petLevel));
  } else {
    sql = sql.replace(/and p\.level = \$PET_LEVEL/g, "");
  }

  if (pet.length) {
    const petIndex = finalValues.length + 1;
    sql = sql.replace(/\$PET/g, `$${petIndex}`);
    finalValues.push(pet);
  } else {
    sql = sql.replace(/and p\.pet_name = \$PET/g, "");
    sql = sql.replace(/and p\.pet_name = any\(\$PET\)/g, "");
  }

  if (perk.length) {
    const perkIndex = finalValues.length + 1;
    sql = sql.replace(/\$PERK/g, `$${perkIndex}`);
    finalValues.push(perk);
  } else {
    sql = sql.replace(/and p\.perk = \$PERK/g, "");
    sql = sql.replace(/and p\.perk = any\(\$PERK\)/g, "");
  }

  if (toy.length) {
    const toyIndex = finalValues.length + 1;
    sql = sql.replace(/\$TOY/g, `$${toyIndex}`);
    finalValues.push(toy);
  } else {
    sql = sql.replace(/and p\.toy = \$TOY/g, "");
    sql = sql.replace(/and p\.toy = any\(\$TOY\)/g, "");
  }

  bindToken("$ALLY_PET", allyPet.length ? allyPet : null);
  bindToken("$OPP_PET", opponentPet.length ? opponentPet : null);
  bindToken("$ALLY_PERK", allyPerk.length ? allyPerk : null);
  bindToken("$OPP_PERK", opponentPerk.length ? opponentPerk : null);
  bindToken("$ALLY_TOY", allyToy.length ? allyToy : null);
  bindToken("$OPP_TOY", opponentToy.length ? opponentToy : null);
  bindToken("$MIN_SAMPLE_SIZE", minSample);
  bindToken("$MIN_END_ON", minEndOn);
  if (minTurn !== null) {
    const minTurnIndex = finalValues.length + 1;
    sql = sql.replace(/\$MIN_TURN/g, `$${minTurnIndex}`);
    finalValues.push(minTurn);
  } else {
    sql = sql.replace(/and t\.turn_number >= \$MIN_TURN/g, "");
  }

  if (maxTurn !== null) {
    const maxTurnIndex = finalValues.length + 1;
    sql = sql.replace(/\$MAX_TURN/g, `$${maxTurnIndex}`);
    finalValues.push(maxTurn);
  } else {
    sql = sql.replace(/and t\.turn_number <= \$MAX_TURN/g, "");
  }


  const { rows } = await pool.query(sql, finalValues);
  const row = rows[0] || { total_games: 0, pack_stats: [], matchup_stats: [], pet_stats: [] };

  const payload = {
    totalGames: Number(row.total_games || 0),
    totalBattles: Number(row.total_battles || 0),
    generatedAt: new Date().toISOString(),
    newestEntryAt: row.newest_entry_at || null,
    packStats: row.pack_stats || [],
    matchupStats: row.matchup_stats || [],
    petStats: row.pet_stats || [],
    perkStats: row.perk_stats || [],
    toyStats: row.toy_stats || []
  };

  if (statsResponseCache.size >= STATS_CACHE_MAX_KEYS) {
    const oldestKey = statsResponseCache.keys().next().value;
    if (oldestKey) statsResponseCache.delete(oldestKey);
  }
  statsResponseCache.set(cacheKey, { timestamp: Date.now(), payload });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      "X-Stats-Cache": "MISS"
    }
  });
}
