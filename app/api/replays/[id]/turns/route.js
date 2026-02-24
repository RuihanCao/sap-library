import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { parseReplayForCalculator } from "@/lib/calculator";

export const runtime = "nodejs";

function parseJson(input) {
  if (!input) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

export async function GET(_req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

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
         match_type,
         created_at,
         raw_json
       from replays
       where id = $1`,
      [id]
    );

    if (!replayRes.rowCount) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const replayRow = replayRes.rows[0];
    const raw = replayRow.raw_json;
    if (!raw) {
      return NextResponse.json({ error: "raw_json missing" }, { status: 500 });
    }

    const actions = Array.isArray(raw.Actions) ? raw.Actions : [];

    let buildModel = parseJson(raw.GenesisModeModel);
    if (!buildModel) {
      const modeAction = actions.find((a) => a.Type === 1 && a.Mode);
      if (modeAction) {
        buildModel = parseJson(modeAction.Mode);
      }
    }

    const battles = actions
      .filter((a) => a.Type === 0 && a.Battle)
      .map((a) => parseJson(a.Battle))
      .filter(Boolean);

    const turns = battles.map((battle, index) => {
      const state = parseReplayForCalculator(battle, buildModel);

      return {
        // Metadata
        turnNumber: index + 1,
        outcome: battle.Outcome,
        opponentName: battle.Opponent?.DisplayName || null,
        playerLives: battle.User?.Lives ?? null,

        // Calculator State (Flattened)
        ...state,

        // Legacy pets structure for backward compatibility
        pets: {
          player: state.playerPets,
          opponent: state.opponentPets
        }
      };
    });

    const responseData = {
      replay: {
        id: replayRow.id,
        participation_id: replayRow.participation_id,
        player_name: replayRow.player_name,
        opponent_name: replayRow.opponent_name,
        pack: replayRow.pack,
        opponent_pack: replayRow.opponent_pack,
        game_version: replayRow.game_version,
        match_type: replayRow.match_type,
        created_at: replayRow.created_at,
        raw_json: raw
      },
      turnCount: turns.length,
      turns
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in /api/replays/:id/turns:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

