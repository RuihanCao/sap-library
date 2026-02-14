import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { resolveVersionFilter } from "@/lib/versionFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractParticipationId(input) {
  if (input === null || input === undefined) return null;
  const text = String(input).trim();
  if (!text) return null;

  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      const fromJson =
        parsed?.Pid ||
        parsed?.pid ||
        parsed?.ParticipationId ||
        parsed?.participationId;
      if (fromJson && uuidRegex.test(String(fromJson))) {
        return String(fromJson).match(uuidRegex)[0];
      }
    } catch {
      // ignore
    }
  }

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const candidates = [
        url.searchParams.get("Pid"),
        url.searchParams.get("pid"),
        url.searchParams.get("ParticipationId"),
        url.searchParams.get("participationId"),
        url.searchParams.get("participation_id")
      ].filter(Boolean);

      for (const candidate of candidates) {
        const match = String(candidate).match(uuidRegex);
        if (match) return match[0];
      }

      const hashMatch = decodeURIComponent(url.hash || "").match(uuidRegex);
      if (hashMatch) return hashMatch[0];
    } catch {
      // ignore
    }
  }

  const keyedMatch = text.match(
    /(?:^|[?&#])(?:pid|Pid|participationId|ParticipationId|participation_id)=([0-9a-f-]{36})/i
  );
  if (keyedMatch) return keyedMatch[1];

  const plainMatch = text.match(uuidRegex);
  if (plainMatch) return plainMatch[0];

  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const player = searchParams.get("player");
  const playerId = searchParams.get("playerId");
  const pid = extractParticipationId(searchParams.get("pid"));
  const opponent = searchParams.get("opponent");
  const winningPack = searchParams.get("winningPack");
  const minRankRaw = searchParams.get("minRank");
  const minRank = minRankRaw !== null && minRankRaw !== "" && Number.isFinite(Number(minRankRaw))
    ? Number(minRankRaw)
    : null;
  const minRankMode = (searchParams.get("minRankMode") || "any").toLowerCase();
  const packA = searchParams.get("packA");
  const packB = searchParams.get("packB");
  const excludeA = searchParams.get("excludeA");
  const excludeB = searchParams.get("excludeB");
  const mirrorMatch = searchParams.get("mirrorMatch") === "true";
  const versionFilterRaw = searchParams.get("version");
  const matchTypeList = Array.from(
    new Set(
      searchParams
        .getAll("matchType")
        .flatMap((value) => parseList(value))
        .map((value) => value.toLowerCase())
        .filter(Boolean)
    )
  );
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
  const minTurnRaw = searchParams.get("minTurn");
  const maxTurnRaw = searchParams.get("maxTurn");
  const minTurn = minTurnRaw === null || minTurnRaw === "" ? null : Number.isFinite(Number(minTurnRaw)) ? Number(minTurnRaw) : null;
  const maxTurn = maxTurnRaw === null || maxTurnRaw === "" ? null : Number.isFinite(Number(maxTurnRaw)) ? Number(maxTurnRaw) : null;

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
  const { versions } = await resolveVersionFilter(pool, versionFilterRaw);

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

  if (pid) {
    values.push(pid);
    clauses.push(`r.participation_id = $${values.length}`);
  }

  if (opponent) {
    values.push(`%${opponent}%`);
    clauses.push(`(r.player_name ilike $${values.length} or r.opponent_name ilike $${values.length})`);
  }

  if (minRank !== null) {
    values.push(minRank);
    const rankExprPlayer = `coalesce((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank')::int, 0)`;
    const rankExprOpponent = `coalesce((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank')::int, 0)`;
    if (minRankMode === "both") {
      clauses.push(`(${rankExprPlayer} >= $${values.length} and ${rankExprOpponent} >= $${values.length})`);
    } else {
      clauses.push(`(${rankExprPlayer} >= $${values.length} or ${rankExprOpponent} >= $${values.length})`);
    }
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

  if (matchTypeList.length && !matchTypeList.includes("any")) {
    values.push(matchTypeList);
    clauses.push(`coalesce(nullif(lower(r.match_type), ''), 'unknown') = any($${values.length})`);
  }

  if (tagList.length) {
    values.push(tagList);
    clauses.push(`coalesce(r.tags, '{}'::text[]) && $${values.length}`);
  }

  if (versions?.length) {
    values.push(versions);
    clauses.push(`r.game_version = any($${values.length})`);
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

  if (startDate) {
    values.push(startDate);
    clauses.push(`r.created_at >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`r.created_at <= $${values.length}`);
  }

  const buildTurnClause = (alias = "p") => {
    let clause = "";
    if (turn !== null) {
      values.push(turn);
      clause += ` and ${alias}.turn_number = $${values.length}`;
      return clause;
    }
    if (minTurn !== null) {
      values.push(minTurn);
      clause += ` and ${alias}.turn_number >= $${values.length}`;
    }
    if (maxTurn !== null) {
      values.push(maxTurn);
      clause += ` and ${alias}.turn_number <= $${values.length}`;
    }
    return clause;
  };

  const addPetClause = () => {
    if (!petList.length) return false;

    if (petMode === "all") {
      values.push(petList);
      const listIndex = values.length;
      const turnClause = buildTurnClause("p");
      values.push(petList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.pet_name = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.pet_name) = $${countIndex})`
      );
      return true;
    }

    values.push(petList);
    const listIndex = values.length;
    const turnClause = buildTurnClause("p");
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
      const turnClause = buildTurnClause("p");
      values.push(perkList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.perk = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.perk) = $${countIndex})`
      );
      return true;
    }

    values.push(perkList);
    const listIndex = values.length;
    const turnClause = buildTurnClause("p");
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
      const turnClause = buildTurnClause("p");
      values.push(toyList.length);
      const countIndex = values.length;
      clauses.push(
        `r.id in (select p.replay_id from pets p where p.toy = any($${listIndex})${turnClause} group by p.replay_id having count(distinct p.toy) = $${countIndex})`
      );
      return true;
    }

    values.push(toyList);
    const listIndex = values.length;
    const turnClause = buildTurnClause("p");
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

  if ((turn !== null || minTurn !== null || maxTurn !== null) && !petUsedTurn && !perkUsedTurn && !toyUsedTurn) {
    let turnClause = "";
    if (turn !== null) {
      values.push(turn);
      turnClause += ` and t.turn_number = $${values.length}`;
    }
    if (minTurn !== null) {
      values.push(minTurn);
      turnClause += ` and t.turn_number >= $${values.length}`;
    }
    if (maxTurn !== null) {
      values.push(maxTurn);
      turnClause += ` and t.turn_number <= $${values.length}`;
    }
    clauses.push(`exists (select 1 from turns t where t.replay_id = r.id${turnClause})`);
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
           r.max_player_count, r.active_player_count, r.created_at, r.tags, lt.outcome as last_outcome,
           (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->>'Rank')::int as player_rank,
           (nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'Rank')::int as opponent_rank
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
