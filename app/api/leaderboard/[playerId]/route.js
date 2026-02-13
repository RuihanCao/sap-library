import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNullableInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

function buildBaseCte() {
  return `
    with replay_base as (
      select
        r.id as replay_id,
        r.created_at,
        r.pack as player_pack,
        r.opponent_pack as opponent_pack,
        r.player_name,
        r.opponent_name,
        nullif(r.raw_json->>'UserId', '') as player_id,
        nullif((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'UserId'), '') as opponent_id,
        coalesce(r.tags, '{}'::text[]) as tags
      from replays r
      where r.match_type != 'arena'
        and r.pack is not null
        and r.opponent_pack is not null
        and r.pack != all($1::text[])
        and r.opponent_pack != all($1::text[])
        and ($2::text[] is null or coalesce(r.tags, '{}'::text[]) && $2::text[])
    ),
    spotlight_base as (
      select
        rb.replay_id,
        rb.created_at,
        rb.player_id as spotlight_id,
        rb.player_name as spotlight_name,
        rb.player_pack as my_pack,
        rb.opponent_pack as opp_pack,
        'player'::text as side
      from replay_base rb
      where rb.player_id is not null

      union all

      select
        rb.replay_id,
        rb.created_at,
        rb.opponent_id as spotlight_id,
        rb.opponent_name as spotlight_name,
        rb.opponent_pack as my_pack,
        rb.player_pack as opp_pack,
        'opponent'::text as side
      from replay_base rb
      where rb.opponent_id is not null
    ),
    spotlight_filtered as (
      select s.*
      from spotlight_base s
      where s.spotlight_id = $10::text
        and ($3::text is null or s.my_pack = $3::text)
        and ($4::text is null or s.opp_pack = $4::text)
        and (
          $5::text[] is null or exists (
            select 1
            from pets p
            where p.replay_id = s.replay_id
              and p.side = s.side
              and p.pet_name = any($5::text[])
          )
        )
        and (
          $6::text[] is null or exists (
            select 1
            from pets p
            where p.replay_id = s.replay_id
              and p.side = s.side
              and p.perk = any($6::text[])
          )
        )
        and (
          $7::text[] is null or exists (
            select 1
            from pets p
            where p.replay_id = s.replay_id
              and p.side = s.side
              and p.toy = any($7::text[])
          )
        )
    ),
    turn_rows as (
      select
        s.spotlight_id,
        s.spotlight_name,
        s.replay_id,
        s.created_at,
        s.my_pack,
        s.opp_pack,
        s.side,
        t.turn_number,
        case
          when s.side = 'player' then t.outcome
          when t.outcome = 1 then 2
          when t.outcome = 2 then 1
          else t.outcome
        end as outcome,
        case when s.side = 'player' then t.player_rolls else t.opponent_rolls end as rolls,
        case when s.side = 'player' then t.player_gold_spent else t.opponent_gold_spent end as gold_spent,
        case when s.side = 'player' then t.player_summons else t.opponent_summons end as summons
      from spotlight_filtered s
      join turns t on t.replay_id = s.replay_id
      where ($8::int is null or t.turn_number >= $8::int)
        and ($9::int is null or t.turn_number <= $9::int)
    )
  `;
}

function buildGameSql() {
  const baseCte = buildBaseCte();
  return `
    ${baseCte},
    game_outcomes as (
      select distinct on (tr.replay_id)
        tr.spotlight_name,
        tr.replay_id,
        tr.created_at,
        tr.my_pack,
        tr.opp_pack,
        tr.outcome
      from turn_rows tr
      order by tr.replay_id, tr.turn_number desc
    ),
    summary as (
      select
        count(*)::int as games,
        sum((go.outcome = 1)::int)::int as wins,
        sum((go.outcome = 2)::int)::int as losses,
        sum((go.outcome = 3)::int)::int as draws
      from game_outcomes go
    ),
    turn_agg as (
      select
        count(*)::int as rounds,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
    ),
    pack_stats as (
      select
        go.my_pack as pack,
        count(*)::int as games,
        sum((go.outcome = 1)::int)::int as wins,
        sum((go.outcome = 2)::int)::int as losses,
        sum((go.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((go.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((go.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((go.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate
      from game_outcomes go
      group by go.my_pack
    ),
    matchup_stats as (
      select
        go.my_pack as pack,
        go.opp_pack as opponent_pack,
        count(*)::int as games,
        sum((go.outcome = 1)::int)::int as wins,
        sum((go.outcome = 2)::int)::int as losses,
        sum((go.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((go.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((go.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((go.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate
      from game_outcomes go
      group by go.my_pack, go.opp_pack
    ),
    per_turn as (
      select
        tr.turn_number,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((tr.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((tr.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((tr.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
      group by tr.turn_number
      order by tr.turn_number
    )
    select
      coalesce((
        select json_build_object(
          'games', s.games,
          'rounds', ta.rounds,
          'wins', s.wins,
          'losses', s.losses,
          'draws', s.draws,
          'winrate', case when (s.wins + s.losses) > 0 then s.wins::float8 / (s.wins + s.losses)::float8 else 0::float8 end,
          'lossrate', case when (s.wins + s.losses) > 0 then s.losses::float8 / (s.wins + s.losses)::float8 else 0::float8 end,
          'drawrate', case when s.games > 0 then s.draws::float8 / s.games::float8 else 0::float8 end,
          'avgRollsPerTurn', coalesce(ta.avg_rolls_per_turn, 0::float8),
          'avgGoldPerTurn', coalesce(ta.avg_gold_per_turn, 0::float8),
          'avgSummonsPerTurn', coalesce(ta.avg_summons_per_turn, 0::float8)
        )
        from summary s
        cross join turn_agg ta
      ), '{}'::json) as summary,
      coalesce((
        select json_agg(row_to_json(ps) order by ps.games desc, ps.pack asc)
        from pack_stats ps
      ), '[]'::json) as pack_stats,
      coalesce((
        select json_agg(row_to_json(ms) order by ms.games desc, ms.pack asc, ms.opponent_pack asc)
        from matchup_stats ms
      ), '[]'::json) as matchup_stats,
      coalesce((
        select json_agg(row_to_json(pt) order by pt.turn_number asc)
        from per_turn pt
      ), '[]'::json) as per_turn,
      coalesce((
        select (array_remove(array_agg(go.spotlight_name order by go.created_at desc), null))[1]
        from game_outcomes go
      ), null) as player_name
  `;
}

function buildBattleSql() {
  const baseCte = buildBaseCte();
  return `
    ${baseCte},
    summary as (
      select
        count(distinct tr.replay_id)::int as games,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
    ),
    pack_stats as (
      select
        tr.my_pack as pack,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((tr.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((tr.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((tr.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate
      from turn_rows tr
      group by tr.my_pack
    ),
    matchup_stats as (
      select
        tr.my_pack as pack,
        tr.opp_pack as opponent_pack,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((tr.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((tr.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((tr.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate
      from turn_rows tr
      group by tr.my_pack, tr.opp_pack
    ),
    per_turn as (
      select
        tr.turn_number,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        case when count(*) > 0 then sum((tr.outcome = 1)::int)::float8 / count(*)::float8 else 0::float8 end as winrate,
        case when count(*) > 0 then sum((tr.outcome = 2)::int)::float8 / count(*)::float8 else 0::float8 end as lossrate,
        case when count(*) > 0 then sum((tr.outcome = 3)::int)::float8 / count(*)::float8 else 0::float8 end as drawrate,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
      group by tr.turn_number
      order by tr.turn_number
    )
    select
      coalesce((
        select json_build_object(
          'games', s.games,
          'rounds', s.rounds,
          'wins', s.wins,
          'losses', s.losses,
          'draws', s.draws,
          'winrate', case when s.rounds > 0 then s.wins::float8 / s.rounds::float8 else 0::float8 end,
          'lossrate', case when s.rounds > 0 then s.losses::float8 / s.rounds::float8 else 0::float8 end,
          'drawrate', case when s.rounds > 0 then s.draws::float8 / s.rounds::float8 else 0::float8 end,
          'avgRollsPerTurn', coalesce(s.avg_rolls_per_turn, 0::float8),
          'avgGoldPerTurn', coalesce(s.avg_gold_per_turn, 0::float8),
          'avgSummonsPerTurn', coalesce(s.avg_summons_per_turn, 0::float8)
        )
        from summary s
      ), '{}'::json) as summary,
      coalesce((
        select json_agg(row_to_json(ps) order by ps.rounds desc, ps.pack asc)
        from pack_stats ps
      ), '[]'::json) as pack_stats,
      coalesce((
        select json_agg(row_to_json(ms) order by ms.rounds desc, ms.pack asc, ms.opponent_pack asc)
        from matchup_stats ms
      ), '[]'::json) as matchup_stats,
      coalesce((
        select json_agg(row_to_json(pt) order by pt.turn_number asc)
        from per_turn pt
      ), '[]'::json) as per_turn,
      coalesce((
        select (array_remove(array_agg(tr.spotlight_name order by tr.created_at desc), null))[1]
        from turn_rows tr
      ), null) as player_name
  `;
}

export async function GET(req, context) {
  const params = await context?.params;
  const playerId = params?.playerId ? decodeURIComponent(params.playerId) : null;
  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "game").toLowerCase() === "battle" ? "battle" : "game";

  const pack = searchParams.get("pack") || null;
  const opponentPack = searchParams.get("opponentPack") || null;
  const tags = parseList(searchParams.get("tags"));
  const pet = parseList(searchParams.get("pet"));
  const perk = parseList(searchParams.get("perk"));
  const toy = parseList(searchParams.get("toy"));
  const minTurnRaw = parseNullableInt(searchParams.get("minTurn"));
  const maxTurnRaw = parseNullableInt(searchParams.get("maxTurn"));
  const minTurn = scope === "battle" ? minTurnRaw : null;
  const maxTurn = scope === "battle" ? maxTurnRaw : null;

  const values = [
    EXCLUDED_PACKS,
    tags.length ? tags : null,
    pack,
    opponentPack,
    pet.length ? pet : null,
    perk.length ? perk : null,
    toy.length ? toy : null,
    minTurn,
    maxTurn,
    playerId
  ];

  const sql = scope === "battle" ? buildBattleSql() : buildGameSql();
  const { rows } = await pool.query(sql, values);
  const row = rows[0] || {};

  return NextResponse.json(
    {
      scope,
      playerId,
      playerName: row.player_name || null,
      summary: row.summary || {},
      packStats: row.pack_stats || [],
      matchupStats: row.matchup_stats || [],
      perTurn: row.per_turn || []
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      }
    }
  );
}
