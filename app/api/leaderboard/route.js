import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
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
        rb.opponent_id as opponent_id,
        rb.opponent_name as opponent_name,
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
        rb.player_id as opponent_id,
        rb.player_name as opponent_name,
        rb.opponent_pack as my_pack,
        rb.player_pack as opp_pack,
        'opponent'::text as side
      from replay_base rb
      where rb.opponent_id is not null
    ),
    spotlight_filtered as (
      select s.*
      from spotlight_base s
      where ($3::text is null or s.my_pack = $3::text)
        and ($4::text is null or s.opp_pack = $4::text)
        and ($10::text is null or s.spotlight_id ilike $10::text or coalesce(s.spotlight_name, '') ilike $10::text)
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

function buildOrder(scope, sortKey, order) {
  const direction = order === "asc" ? "asc" : "desc";
  const sortMap =
    scope === "battle"
      ? {
          player_name: "j.player_name",
          games: "j.games",
          rounds: "j.rounds",
          wins: "j.wins",
          losses: "j.losses",
          draws: "j.draws",
          winrate: "j.winrate",
          lossrate: "j.lossrate",
          drawrate: "j.drawrate",
          avg_rolls: "j.avg_rolls_per_turn",
          avg_gold: "j.avg_gold_per_turn",
          avg_summons: "j.avg_summons_per_turn"
        }
      : {
          player_name: "j.player_name",
          games: "j.games",
          rounds: "j.rounds",
          wins: "j.wins",
          losses: "j.losses",
          draws: "j.draws",
          winrate: "j.winrate",
          lossrate: "j.lossrate",
          drawrate: "j.drawrate",
          avg_rolls: "j.avg_rolls_per_turn",
          avg_gold: "j.avg_gold_per_turn",
          avg_summons: "j.avg_summons_per_turn"
        };
  const column = sortMap[sortKey] || "j.games";
  return `${column} ${direction}, j.player_name asc`;
}

function buildGameSql(orderBy) {
  const baseCte = buildBaseCte();
  return `
    ${baseCte},
    game_outcomes as (
      select distinct on (tr.spotlight_id, tr.replay_id)
        tr.spotlight_id,
        tr.spotlight_name,
        tr.replay_id,
        tr.created_at,
        tr.my_pack,
        tr.opp_pack,
        tr.outcome
      from turn_rows tr
      order by tr.spotlight_id, tr.replay_id, tr.turn_number desc
    ),
    player_rollup as (
      select
        go.spotlight_id as player_id,
        (array_remove(array_agg(go.spotlight_name order by go.created_at desc), null))[1] as player_name,
        count(*)::int as games,
        sum((go.outcome = 1)::int)::int as wins,
        sum((go.outcome = 2)::int)::int as losses,
        sum((go.outcome = 3)::int)::int as draws
      from game_outcomes go
      group by go.spotlight_id
    ),
    player_turn_counts as (
      select
        tr.spotlight_id as player_id,
        count(*)::int as rounds
      from turn_rows tr
      group by tr.spotlight_id
    ),
    player_turn_avgs as (
      select
        tr.spotlight_id as player_id,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
      group by tr.spotlight_id
    ),
    joined as (
      select
        pr.player_id,
        coalesce(nullif(pr.player_name, ''), pr.player_id) as player_name,
        pr.games,
        coalesce(ptc.rounds, 0)::int as rounds,
        pr.wins,
        pr.losses,
        pr.draws,
        case
          when (pr.wins + pr.losses) > 0 then pr.wins::float8 / (pr.wins + pr.losses)::float8
          else 0::float8
        end as winrate,
        case
          when (pr.wins + pr.losses) > 0 then pr.losses::float8 / (pr.wins + pr.losses)::float8
          else 0::float8
        end as lossrate,
        case
          when pr.games > 0 then pr.draws::float8 / pr.games::float8
          else 0::float8
        end as drawrate,
        coalesce(pta.avg_rolls_per_turn, 0::float8) as avg_rolls_per_turn,
        coalesce(pta.avg_gold_per_turn, 0::float8) as avg_gold_per_turn,
        coalesce(pta.avg_summons_per_turn, 0::float8) as avg_summons_per_turn
      from player_rollup pr
      left join player_turn_counts ptc on ptc.player_id = pr.player_id
      left join player_turn_avgs pta on pta.player_id = pr.player_id
    )
    select
      j.player_id,
      j.player_name,
      j.games,
      j.rounds,
      j.wins,
      j.losses,
      j.draws,
      j.winrate,
      j.lossrate,
      j.drawrate,
      j.avg_rolls_per_turn,
      j.avg_gold_per_turn,
      j.avg_summons_per_turn,
      count(*) over()::int as total_players
    from joined j
    where j.games >= $11::int
    order by ${orderBy}
    limit $12::int
    offset $13::int
  `;
}

function buildBattleSql(orderBy) {
  const baseCte = buildBaseCte();
  return `
    ${baseCte},
    player_rollup as (
      select
        tr.spotlight_id as player_id,
        (array_remove(array_agg(tr.spotlight_name order by tr.created_at desc), null))[1] as player_name,
        count(distinct tr.replay_id)::int as games,
        count(*)::int as rounds,
        sum((tr.outcome = 1)::int)::int as wins,
        sum((tr.outcome = 2)::int)::int as losses,
        sum((tr.outcome = 3)::int)::int as draws,
        avg(coalesce(tr.rolls, 0)::float8)::float8 as avg_rolls_per_turn,
        avg(coalesce(tr.gold_spent, 0)::float8)::float8 as avg_gold_per_turn,
        avg(coalesce(tr.summons, 0)::float8)::float8 as avg_summons_per_turn
      from turn_rows tr
      group by tr.spotlight_id
    ),
    joined as (
      select
        pr.player_id,
        coalesce(nullif(pr.player_name, ''), pr.player_id) as player_name,
        pr.games,
        pr.rounds,
        pr.wins,
        pr.losses,
        pr.draws,
        case
          when pr.rounds > 0 then pr.wins::float8 / pr.rounds::float8
          else 0::float8
        end as winrate,
        case
          when pr.rounds > 0 then pr.losses::float8 / pr.rounds::float8
          else 0::float8
        end as lossrate,
        case
          when pr.rounds > 0 then pr.draws::float8 / pr.rounds::float8
          else 0::float8
        end as drawrate,
        coalesce(pr.avg_rolls_per_turn, 0::float8) as avg_rolls_per_turn,
        coalesce(pr.avg_gold_per_turn, 0::float8) as avg_gold_per_turn,
        coalesce(pr.avg_summons_per_turn, 0::float8) as avg_summons_per_turn
      from player_rollup pr
    )
    select
      j.player_id,
      j.player_name,
      j.games,
      j.rounds,
      j.wins,
      j.losses,
      j.draws,
      j.winrate,
      j.lossrate,
      j.drawrate,
      j.avg_rolls_per_turn,
      j.avg_gold_per_turn,
      j.avg_summons_per_turn,
      count(*) over()::int as total_players
    from joined j
    where j.games >= $11::int
    order by ${orderBy}
    limit $12::int
    offset $13::int
  `;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "game").toLowerCase() === "battle" ? "battle" : "game";
  const search = searchParams.get("search")?.trim() || "";
  const minMatches = parsePositiveInt(searchParams.get("minMatches"), 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE));
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const offset = (page - 1) * pageSize;

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

  const sort = (searchParams.get("sort") || "games").toLowerCase();
  const order = (searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy = buildOrder(scope, sort, order);

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
    search ? `%${search}%` : null,
    minMatches,
    pageSize,
    offset
  ];

  const sql = scope === "battle" ? buildBattleSql(orderBy) : buildGameSql(orderBy);
  const { rows } = await pool.query(sql, values);
  const total = Number(rows[0]?.total_players || 0);

  return NextResponse.json(
    {
      scope,
      page,
      pageSize,
      total,
      players: rows.map((row) => ({
        playerId: row.player_id,
        playerName: row.player_name,
        games: Number(row.games || 0),
        rounds: Number(row.rounds || 0),
        wins: Number(row.wins || 0),
        losses: Number(row.losses || 0),
        draws: Number(row.draws || 0),
        winrate: Number(row.winrate || 0),
        lossrate: Number(row.lossrate || 0),
        drawrate: Number(row.drawrate || 0),
        avgRollsPerTurn: Number(row.avg_rolls_per_turn || 0),
        avgGoldPerTurn: Number(row.avg_gold_per_turn || 0),
        avgSummonsPerTurn: Number(row.avg_summons_per_turn || 0)
      }))
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      }
    }
  );
}
