import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const player = searchParams.get("player");
  const playerId = searchParams.get("playerId");
  const opponent = searchParams.get("opponent");
  const minRankRaw = searchParams.get("minRank");
  const minRank = minRankRaw !== null && minRankRaw !== "" && Number.isFinite(Number(minRankRaw))
    ? Number(minRankRaw)
    : null;
  const packA = searchParams.get("packA");
  const packB = searchParams.get("packB");
  const excludeA = searchParams.get("excludeA");
  const excludeB = searchParams.get("excludeB");
  const mirrorMatch = searchParams.get("mirrorMatch") === "true";
  const matchType = (searchParams.get("matchType") || "").toLowerCase();
  const tagList = parseList(searchParams.get("tags"));

  const petList = parseList(searchParams.get("pet"));
  const perkList = parseList(searchParams.get("perk"));
  const toyList = parseList(searchParams.get("toy"));

  const petMode = (searchParams.get("petMode") || "any").toLowerCase();
  const perkMode = (searchParams.get("perkMode") || "any").toLowerCase();
  const toyMode = (searchParams.get("toyMode") || "any").toLowerCase();

  const petLevelName = searchParams.get("petLevelName");
  const petLevelMinRaw = searchParams.get("petLevelMin");
  const petLevelMin = petLevelMinRaw ? Number(petLevelMinRaw) : null;

  const exactTeamRaw = searchParams.get("exactTeam");
  const exactTeam = exactTeamRaw ? parseList(exactTeamRaw).slice(0, 5) : [];

  const outcome = (searchParams.get("outcome") || "").toLowerCase();
  const outcomeTurnRaw = searchParams.get("outcomeTurn");
  const outcomeTurn = outcomeTurnRaw ? Number(outcomeTurnRaw) : null;

  const minWinsRaw = searchParams.get("minWins");
  const minWins = minWinsRaw ? Number(minWinsRaw) : null;

  const goldMinRaw = searchParams.get("goldMin");
  const goldMaxRaw = searchParams.get("goldMax");
  const rollsMinRaw = searchParams.get("rollsMin");
  const rollsMaxRaw = searchParams.get("rollsMax");
  const summonsMinRaw = searchParams.get("summonsMin");
  const summonsMaxRaw = searchParams.get("summonsMax");
  const econSide = (searchParams.get("econSide") || "either").toLowerCase();

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const turnRaw = searchParams.get("turn");
  const turnValue = turnRaw === null ? "" : String(turnRaw).trim();
  const turn = turnValue === "" ? null : Number.isFinite(Number(turnValue)) ? Number(turnValue) : null;

  const pageRaw = searchParams.get("page");
  const pageSizeRaw = searchParams.get("pageSize");
  const page = Math.max(1, Number(pageRaw) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw) || 10));
  const offset = (page - 1) * pageSize;

  const sortKey = (searchParams.get("sort") || "created_at").toLowerCase();
  const order = (searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const sortMap = {
    created_at: "r.created_at",
    player_name: "r.player_name",
    pack: "r.pack"
  };
  const sortColumn = sortMap[sortKey] || "r.created_at";

  const clauses = [];
  const values = [];

  if (player) {
    values.push(`%${player}%`);
    clauses.push(`(r.player_name ilike $${values.length} or r.opponent_name ilike $${values.length})`);
  }
  if (playerId) {
    values.push(playerId, `%${playerId}%`);
    const exactIdx = values.length - 1;
    const likeIdx = values.length;
    clauses.push(`((r.raw_json->>'UserId') = $${exactIdx} or coalesce(r.raw_json->>'GenesisModeModel', '') ilike $${likeIdx})`);
  }

  if (opponent) {
    values.push(`%${opponent}%`);
    clauses.push(`(r.player_name ilike $${values.length} or r.opponent_name ilike $${values.length})`);
  }

  if (minRank !== null) {
    values.push(minRank);
    const rankExprPlayer = `coalesce((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank')::int, 0)`;
    const rankExprOpponent = `coalesce((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank')::int, 0)`;
    clauses.push(`(${rankExprPlayer} >= $${values.length} or ${rankExprOpponent} >= $${values.length})`);
  }

  if (packA && packB) {
    values.push(packA, packB);
    const a = values.length - 1;
    const b = values.length;
    clauses.push(
      `((r.pack = $${a} and r.opponent_pack = $${b}) or (r.pack = $${b} and r.opponent_pack = $${a}))`
    );
  } else if (packA) {
    values.push(packA);
    clauses.push(`(r.pack = $${values.length} or r.opponent_pack = $${values.length})`);
  } else if (packB) {
    values.push(packB);
    clauses.push(`(r.pack = $${values.length} or r.opponent_pack = $${values.length})`);
  }

  if (excludeA && excludeB) {
    values.push(excludeA, excludeB);
    const a = values.length - 1;
    const b = values.length;
    clauses.push(
      `not ((r.pack = $${a} and r.opponent_pack = $${b}) or (r.pack = $${b} and r.opponent_pack = $${a}))`
    );
  }

  if (mirrorMatch) {
    clauses.push(`r.pack is not null and r.pack = r.opponent_pack`);
  }

  if (matchType && matchType !== "any") {
    values.push(matchType);
    clauses.push(`r.match_type = $${values.length}`);
  }

  if (tagList.length) {
    values.push(tagList);
    clauses.push(`coalesce(r.tags, '{}'::text[]) && $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    clauses.push(`r.created_at >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`r.created_at <= $${values.length}`);
  }

  const addPetClause = () => {
    if (!petList.length) return false;

    if (petMode === "all") {
      values.push(petList);
      const listIndex = values.length;
      let turnClause = "";
      if (turn !== null) {
        values.push(turn);
        turnClause = ` and p.turn_number = $${values.length}`;
      }
      values.push(petList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.pet_name = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.pet_name) = $${countIndex})`
      );
      return true;
    }

    values.push(petList);
    const listIndex = values.length;
    let turnClause = "";
    if (turn !== null) {
      values.push(turn);
      turnClause = ` and p.turn_number = $${values.length}`;
    }
    clauses.push(
      `exists (select 1 from pets p where p.replay_id = r.id and p.pet_name = any($${listIndex})${turnClause})`
    );
    return true;
  };

  const addPerkClause = () => {
    if (!perkList.length) return false;

    if (perkMode === "all") {
      values.push(perkList);
      const listIndex = values.length;
      let turnClause = "";
      if (turn !== null) {
        values.push(turn);
        turnClause = ` and p.turn_number = $${values.length}`;
      }
      values.push(perkList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.perk = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.perk) = $${countIndex})`
      );
      return true;
    }

    values.push(perkList);
    const listIndex = values.length;
    let turnClause = "";
    if (turn !== null) {
      values.push(turn);
      turnClause = ` and p.turn_number = $${values.length}`;
    }
    clauses.push(
      `exists (select 1 from pets p where p.replay_id = r.id and p.perk = any($${listIndex})${turnClause})`
    );
    return true;
  };

  const addToyClause = () => {
    if (!toyList.length) return false;

    if (toyMode === "all") {
      values.push(toyList);
      const listIndex = values.length;
      let turnClause = "";
      if (turn !== null) {
        values.push(turn);
        turnClause = ` and p.turn_number = $${values.length}`;
      }
      values.push(toyList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.toy = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.toy) = $${countIndex})`
      );
      return true;
    }

    values.push(toyList);
    const listIndex = values.length;
    let turnClause = "";
    if (turn !== null) {
      values.push(turn);
      turnClause = ` and p.turn_number = $${values.length}`;
    }
    clauses.push(
      `exists (select 1 from pets p where p.replay_id = r.id and p.toy = any($${listIndex})${turnClause})`
    );
    return true;
  };

  const petUsedTurn = addPetClause();
  const perkUsedTurn = addPerkClause();
  const toyUsedTurn = addToyClause();

  if (petLevelName && petLevelMin) {
    values.push(petLevelName, petLevelMin);
    const n = values.length - 1;
    const l = values.length;
    clauses.push(
      `exists (select 1 from pets p where p.replay_id = r.id and p.pet_name = $${n} and p.level >= $${l})`
    );
  }

  if (exactTeam.length === 5 && turn !== null) {
    values.push(turn);
    const tIndex = values.length;
    const teamArray = `{${exactTeam.map((p) => `"${p}"`).join(",")}}`;
    values.push(teamArray);
    const teamIndex = values.length;
    clauses.push(
      `exists (
        select 1 from (
          select p.replay_id, p.side, array_agg(p.pet_name order by p.position) as team
          from pets p
          where p.turn_number = $${tIndex}
          group by p.replay_id, p.side
        ) s where s.replay_id = r.id and s.team = $${teamIndex}::text[]
      )`
    );
  }

  if (outcome) {
    const outcomeMap = { win: 1, loss: 2, draw: 3 };
    const outcomeValue = outcomeMap[outcome];
    if (outcomeValue) {
      values.push(outcomeValue);
      let turnClause = "";
      if (outcomeTurn !== null && Number.isFinite(outcomeTurn)) {
        values.push(outcomeTurn);
        turnClause = ` and t.turn_number = $${values.length}`;
      }
      clauses.push(
        `exists (select 1 from turns t where t.replay_id = r.id and t.outcome = $${values.length - (turnClause ? 1 : 0)}${turnClause})`
      );
    }
  }

  if (minWins !== null && Number.isFinite(minWins)) {
    values.push(minWins);
    clauses.push(
      `(
        select count(*) from turns t
        where t.replay_id = r.id and t.outcome = 1
      ) >= $${values.length}`
    );
  }

  const addEconomyClause = (fieldPlayer, fieldOpp, minRaw, maxRaw) => {
    const min = minRaw ? Number(minRaw) : null;
    const max = maxRaw ? Number(maxRaw) : null;
    if (min === null && max === null) return;

    if (econSide === "player") {
      if (min !== null) {
        values.push(min);
        clauses.push(`exists (select 1 from turns t where t.replay_id = r.id and t.${fieldPlayer} >= $${values.length})`);
      }
      if (max !== null) {
        values.push(max);
        clauses.push(`exists (select 1 from turns t where t.replay_id = r.id and t.${fieldPlayer} <= $${values.length})`);
      }
      return;
    }

    if (econSide === "opponent") {
      if (min !== null) {
        values.push(min);
        clauses.push(`exists (select 1 from turns t where t.replay_id = r.id and t.${fieldOpp} >= $${values.length})`);
      }
      if (max !== null) {
        values.push(max);
        clauses.push(`exists (select 1 from turns t where t.replay_id = r.id and t.${fieldOpp} <= $${values.length})`);
      }
      return;
    }

    if (min !== null) {
      values.push(min);
      clauses.push(
        `exists (select 1 from turns t where t.replay_id = r.id and (t.${fieldPlayer} >= $${values.length} or t.${fieldOpp} >= $${values.length}))`
      );
    }
    if (max !== null) {
      values.push(max);
      clauses.push(
        `exists (select 1 from turns t where t.replay_id = r.id and (t.${fieldPlayer} <= $${values.length} or t.${fieldOpp} <= $${values.length}))`
      );
    }
  };

  addEconomyClause("player_gold_spent", "opponent_gold_spent", goldMinRaw, goldMaxRaw);
  addEconomyClause("player_rolls", "opponent_rolls", rollsMinRaw, rollsMaxRaw);
  addEconomyClause("player_summons", "opponent_summons", summonsMinRaw, summonsMaxRaw);

  if (turn !== null && !petUsedTurn && !perkUsedTurn && !toyUsedTurn) {
    values.push(turn);
    clauses.push(
      `exists (select 1 from turns t where t.replay_id = r.id and t.turn_number = $${values.length})`
    );
  }

  const fromSql = `from replays r`;
  const whereSql = clauses.length ? `where ${clauses.join(" and ")}` : "";

  const countSql = `select count(*) as total ${fromSql} ${whereSql}`;
  const countValues = values.slice();
  const countResult = await pool.query(countSql, countValues);
  const total = Number(countResult.rows[0]?.total || 0);

  values.push(pageSize, offset);
  const dataSql = `
    select r.id, r.participation_id, r.player_name, r.opponent_name, r.pack, r.opponent_pack, r.game_version, r.match_type, r.mode,
           r.max_player_count, r.active_player_count, r.created_at, r.tags, lt.outcome as last_outcome
    ${fromSql}
    left join lateral (
      select t.outcome
      from turns t
      where t.replay_id = r.id
      order by t.turn_number desc
      limit 1
    ) lt on true
    ${whereSql}
    order by ${sortColumn} ${order}
    limit $${values.length - 1} offset $${values.length}
  `;

  const { rows } = await pool.query(dataSql, values);
  return NextResponse.json(
    { results: rows, total, page, pageSize },
    { headers: { "Cache-Control": "no-store" } }
  );
}
