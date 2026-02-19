import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { parseReplayForCalculator, generateCalculatorLink } = require("@/lib/calculator");

export const runtime = "nodejs";

function parseJsonValue(input) {
  if (!input) {
    return null;
  }
  if (typeof input === "object") {
    return input;
  }
  if (typeof input !== "string") {
    return null;
  }
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function parseBattle(action) {
  if (!action || action.Type !== 0 || !action.Battle) {
    return null;
  }
  return parseJsonValue(action.Battle);
}

export async function GET(req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const requestUrl = new URL(req.url);
  const turn = Number.parseInt(requestUrl.searchParams.get("turn") || "", 10);
  if (!Number.isFinite(turn) || turn < 1) {
    return NextResponse.json({ error: "turn must be a positive integer" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "select id, participation_id, raw_json from replays where id = $1",
    [id]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const replay = rows[0].raw_json;
  const actions = Array.isArray(replay?.Actions) ? replay.Actions : [];
  const battles = actions.map(parseBattle).filter(Boolean);

  if (!battles.length) {
    return NextResponse.json({ error: "no battles found in replay" }, { status: 404 });
  }

  if (turn > battles.length) {
    return NextResponse.json(
      { error: `turn ${turn} not found`, maxTurn: battles.length },
      { status: 400 }
    );
  }

  let buildModel = parseJsonValue(replay?.GenesisModeModel);
  if (!buildModel) {
    const modeAction = actions.find((action) => action?.Type === 1 && action?.Mode);
    buildModel = parseJsonValue(modeAction?.Mode);
  }

  try {
    const calculatorState = parseReplayForCalculator(battles[turn - 1], buildModel);
    const url = generateCalculatorLink(calculatorState);

    if (!url || typeof url !== "string") {
      throw new Error("calculator link generation returned an invalid value");
    }

    return NextResponse.json({
      replayId: rows[0].id,
      participationId: rows[0].participation_id,
      turn,
      maxTurn: battles.length,
      url
    });
  } catch (error) {
    console.error("Failed to generate calculator link", {
      id,
      turn,
      error: error?.message || error,
      stack: error?.stack || null
    });
    return NextResponse.json({ error: "failed to generate calculator link" }, { status: 500 });
  }
}
