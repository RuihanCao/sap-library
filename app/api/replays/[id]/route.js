import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

function normalizeTags(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(_req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const client = await pool.connect();
  try {
    const replayRes = await client.query(
      `select
         id,
         participation_id,
         player_name,
         opponent_name,
         pack,
         opponent_pack,
         game_version,
         max_lives,
         mode,
         match_type,
         match_name,
         match_pack,
         max_player_count,
         active_player_count,
         spectator_mode,
         tags,
         created_at,
         raw_json
       from replays
       where id=$1`,
      [id]
    );

    if (!replayRes.rowCount) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const statsRes = await client.query(
      `select
         count(*)::int as turns,
         max(turn_number)::int as last_turn,
         (select outcome from turns where replay_id=$1 order by turn_number desc limit 1) as last_outcome,
         coalesce(sum(player_gold_spent), 0)::int as player_gold_spent,
         coalesce(sum(opponent_gold_spent), 0)::int as opponent_gold_spent,
         coalesce(sum(player_rolls), 0)::int as player_rolls,
         coalesce(sum(opponent_rolls), 0)::int as opponent_rolls
       from turns
       where replay_id=$1`,
      [id]
    );

    let playerId = null;
    let opponentId = null;
    let playerRank = null;
    let opponentRank = null;
    try {
      const raw = replayRes.rows[0].raw_json;
      playerId = raw?.UserId || null;
      try {
        const modeModel = raw?.GenesisModeModel ? JSON.parse(raw.GenesisModeModel) : null;
        opponentId = modeModel?.Opponents?.[0]?.UserId || null;
        const parsedPlayerRank = modeModel?.Rank;
        const parsedOpponentRank = modeModel?.Opponents?.[0]?.Rank;
        playerRank = Number.isFinite(parsedPlayerRank) ? parsedPlayerRank : null;
        opponentRank = Number.isFinite(parsedOpponentRank) ? parsedOpponentRank : null;
      } catch {
        // ignore
      }
      const actions = raw?.Actions || [];
      const battles = actions
        .filter((a) => a.Type === 0)
        .map((a) => JSON.parse(a.Battle));
      if (playerRank === null || opponentRank === null) {
        for (let i = actions.length - 1; i >= 0; i -= 1) {
          const action = actions[i];
          if (action?.Type !== 1 || !action?.Mode) continue;
          try {
            const mode = typeof action.Mode === "string" ? JSON.parse(action.Mode) : action.Mode;
            if (playerRank === null && Number.isFinite(mode?.Rank)) {
              playerRank = mode.Rank;
            }
            if (opponentRank === null && Number.isFinite(mode?.Opponents?.[0]?.Rank)) {
              opponentRank = mode.Opponents[0].Rank;
            }
            if (playerRank !== null && opponentRank !== null) break;
          } catch {
            // ignore
          }
        }
      }
      if (!opponentId) {
        opponentId = battles?.[0]?.Opponent?.Id || null;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      replay: {
        ...replayRes.rows[0],
        player_id: playerId,
        opponent_id: opponentId,
        player_rank: playerRank,
        opponent_rank: opponentRank,
        raw_json: undefined
      },
      stats: {
        ...(statsRes.rows[0] || { turns: 0, last_turn: null, last_outcome: null })
      }
    });
  } finally {
    client.release();
  }
}

export async function PATCH(req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const tags = normalizeTags(body?.tags);

  const client = await pool.connect();
  try {
    const updateRes = await client.query(
      `update replays set tags=$1 where id=$2 returning tags`,
      [tags, id]
    );
    if (!updateRes.rowCount) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ tags: updateRes.rows[0].tags || [] });
  } finally {
    client.release();
  }
}
