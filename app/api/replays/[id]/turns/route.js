import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

function withCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

function toPetRow(row) {
  return {
    side: row.side,
    position: row.position,
    petName: row.pet_name,
    level: row.level,
    attack: row.attack,
    health: row.health,
    perk: row.perk,
    toy: row.toy
  };
}

function toTurnRow(row) {
  return {
    turnNumber: row.turn_number,
    outcome: row.outcome,
    opponentName: row.opponent_name,
    playerLives: row.player_lives,
    playerGoldSpent: row.player_gold_spent,
    opponentGoldSpent: row.opponent_gold_spent,
    playerRolls: row.player_rolls,
    opponentRolls: row.opponent_rolls,
    playerSummons: row.player_summons,
    opponentSummons: row.opponent_summons,
    pets: {
      player: [],
      opponent: []
    }
  };
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(_req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) {
    return withCors(NextResponse.json({ error: "id required" }, { status: 400 }));
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
         created_at
       from replays
       where id = $1`,
      [id]
    );

    if (!replayRes.rowCount) {
      return withCors(NextResponse.json({ error: "not found" }, { status: 404 }));
    }

    const turnsRes = await client.query(
      `select
         turn_number,
         outcome,
         opponent_name,
         player_lives,
         player_gold_spent,
         opponent_gold_spent,
         player_rolls,
         opponent_rolls,
         player_summons,
         opponent_summons
       from turns
       where replay_id = $1
       order by turn_number asc`,
      [id]
    );

    const petsRes = await client.query(
      `select
         turn_number,
         side,
         position,
         pet_name,
         level,
         attack,
         health,
         perk,
         toy
       from pets
       where replay_id = $1
       order by
         turn_number asc,
         case when side = 'player' then 0 else 1 end asc,
         position asc nulls last,
         pet_name asc`,
      [id]
    );

    const turnsByNumber = new Map();
    const turns = turnsRes.rows.map((row) => {
      const mapped = toTurnRow(row);
      turnsByNumber.set(mapped.turnNumber, mapped);
      return mapped;
    });

    for (const row of petsRes.rows) {
      const turn = turnsByNumber.get(row.turn_number);
      if (!turn) continue;
      const sideKey = row.side === "opponent" ? "opponent" : "player";
      turn.pets[sideKey].push(toPetRow(row));
    }

    return withCors(
      NextResponse.json({
        replay: replayRes.rows[0],
        turnCount: turns.length,
        turns
      })
    );
  } finally {
    client.release();
  }
}
