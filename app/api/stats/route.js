import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXCLUDED_PACKS = ["Custom", "Weekly"];

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const pack = searchParams.get("pack") || "";
  const opponentPack = searchParams.get("opponentPack") || "";
  const player = searchParams.get("player") || "";
  const playerId = searchParams.get("playerId") || "";
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

  const values = [];
  let playerNameIndex = null;
  let playerIdExactIndex = null;
  let playerIdLikeIndex = null;
  const clauses = [
    `r.match_type != 'arena'`,
    `r.pack is not null`,
    `r.opponent_pack is not null`,
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
  if (player) {
    values.push(`%${player}%`);
    playerNameIndex = values.length;
    clauses.push(`(r.player_name ilike $${playerNameIndex} or r.opponent_name ilike $${playerNameIndex})`);
  }
  if (playerId) {
    values.push(playerId, `%${playerId}%`);
    playerIdExactIndex = values.length - 1;
    playerIdLikeIndex = values.length;
    clauses.push(`((r.raw_json->>'UserId') = $${playerIdExactIndex} or coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${playerIdLikeIndex})`);
  }
  if (tags.length) {
    values.push(tags);
    clauses.push(`coalesce(r.tags, '{}'::text[]) && $${values.length}`);
  }

  const petClause = pet.length ? "and p.pet_name = any($PET)" : "";
  const petLevelClause = petLevel ? "and p.level = $PET_LEVEL" : "";
  const perkClause = perk.length ? "and p.perk = any($PERK)" : "";
  const toyClause = toy.length ? "and p.toy = any($TOY)" : "";

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
    includePlayerSideExprParts.push(`(r.raw_json->>'UserId') = $${playerIdExactIndex}`);
  }
  if (playerIdLikeIndex !== null) {
    includeOpponentSideExprParts.push(`coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${playerIdLikeIndex}`);
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
        'player'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
      where b.include_player_side
      union all
      select
        b.id,
        b.opponent_pack as pack,
        o.outcome as outcome,
        'opponent'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
      where b.include_opponent_side
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
    )
    select
      (select count(*) from base) as total_games,
      (select count(*) from turns t join base b on b.id = t.replay_id) as total_battles,
      (select max(created_at) from base) as newest_entry_at,
      (select coalesce(json_agg(row_to_json(cps)), '[]'::json) from (
        select
          cp.pack as pack,
          count(*)::int as games,
          sum(case
            when cp.side = 'player' and cp.outcome = 1 then 1
            when cp.side = 'opponent' and cp.outcome = 2 then 1
            else 0
          end)::int as wins,
          sum(case when cp.outcome = 3 then 1 else 0 end)::int as draws
        from combined_pack cp
        group by cp.pack
        order by cp.pack
      ) cps) as pack_stats,
      (select coalesce(json_agg(row_to_json(pet_stats)), '[]'::json) from (
        select
          pl.pet_name as pet_name,
          (select count(*) from combined_pet_any pa where pa.pet_name = pl.pet_name)::int as games_with,
          (select count(*) from combined_pet_any pa join outcomes o on o.replay_id = pa.id where pa.pet_name = pl.pet_name and (
            (pa.side = 'player' and o.outcome = 1) or (pa.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_pet_any pa join outcomes o on o.replay_id = pa.id where pa.pet_name = pl.pet_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_pet_end pe where pe.pet_name = pl.pet_name)::int as games_end,
          (select count(*) from combined_pet_end pe join outcomes o on o.replay_id = pe.id where pe.pet_name = pl.pet_name and (
            (pe.side = 'player' and o.outcome = 1) or (pe.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_pet_end pe join outcomes o on o.replay_id = pe.id where pe.pet_name = pl.pet_name and o.outcome = 3)::int as draws_end
        from combined_pet_list pl
        order by (select count(*) from combined_pet_any pa where pa.pet_name = pl.pet_name) desc, pl.pet_name asc
        limit 50
      ) pet_stats) as pet_stats,
      (select coalesce(json_agg(row_to_json(perk_stats)), '[]'::json) from (
        select
          pl.perk_name as perk_name,
          (select count(*) from combined_perk_any pa where pa.perk_name = pl.perk_name)::int as games_with,
          (select count(*) from combined_perk_any pa join outcomes o on o.replay_id = pa.id where pa.perk_name = pl.perk_name and (
            (pa.side = 'player' and o.outcome = 1) or (pa.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_perk_any pa join outcomes o on o.replay_id = pa.id where pa.perk_name = pl.perk_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_perk_end pe where pe.perk_name = pl.perk_name)::int as games_end,
          (select count(*) from combined_perk_end pe join outcomes o on o.replay_id = pe.id where pe.perk_name = pl.perk_name and (
            (pe.side = 'player' and o.outcome = 1) or (pe.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_perk_end pe join outcomes o on o.replay_id = pe.id where pe.perk_name = pl.perk_name and o.outcome = 3)::int as draws_end
        from combined_perk_list pl
        order by (select count(*) from combined_perk_any pa where pa.perk_name = pl.perk_name) desc, pl.perk_name asc
        limit 50
      ) perk_stats) as perk_stats,
      (select coalesce(json_agg(row_to_json(toy_stats)), '[]'::json) from (
        select
          tl.toy_name as toy_name,
          (select count(*) from combined_toy_any ta where ta.toy_name = tl.toy_name)::int as games_with,
          (select count(*) from combined_toy_any ta join outcomes o on o.replay_id = ta.id where ta.toy_name = tl.toy_name and (
            (ta.side = 'player' and o.outcome = 1) or (ta.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_toy_any ta join outcomes o on o.replay_id = ta.id where ta.toy_name = tl.toy_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_toy_end te where te.toy_name = tl.toy_name)::int as games_end,
          (select count(*) from combined_toy_end te join outcomes o on o.replay_id = te.id where te.toy_name = tl.toy_name and (
            (te.side = 'player' and o.outcome = 1) or (te.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_toy_end te join outcomes o on o.replay_id = te.id where te.toy_name = tl.toy_name and o.outcome = 3)::int as draws_end
        from combined_toy_list tl
        order by (select count(*) from combined_toy_any ta where ta.toy_name = tl.toy_name) desc, tl.toy_name asc
        limit 50
      ) toy_stats) as toy_stats
  `;

  const battleSql = `
    with base as (
      select
        r.id,
        r.pack,
        r.opponent_pack,
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
    pack_rounds as (
      select tb.turn_id, b.pack as pack, 'player'::text as side, tb.outcome
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_player_side
      union all
      select tb.turn_id, b.opponent_pack as pack, 'opponent'::text as side, tb.outcome
      from turns_base tb
      join base b on b.id = tb.replay_id
      where b.include_opponent_side
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
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws
        from pack_rounds pr
        group by pr.pack
        order by pr.pack
      ) cps) as pack_stats,
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
        limit 50
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
        limit 50
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
        limit 50
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
  const row = rows[0] || { total_games: 0, pack_stats: [], pet_stats: [] };

  return NextResponse.json(
    {
      totalGames: Number(row.total_games || 0),
      totalBattles: Number(row.total_battles || 0),
      generatedAt: new Date().toISOString(),
      newestEntryAt: row.newest_entry_at || null,
      packStats: row.pack_stats || [],
      petStats: row.pet_stats || [],
      perkStats: row.perk_stats || [],
      toyStats: row.toy_stats || []
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
      }
    }
  );
}
