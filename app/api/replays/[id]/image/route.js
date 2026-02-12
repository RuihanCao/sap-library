import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { renderReplayImage } = require("@/lib/render");
const { getBattleInfo } = require("@/lib/battle");

export const runtime = "nodejs";

export async function GET(req, context) {
  const params = context?.params ? await context.params : null;
  const idFromParams = params?.id;
  let id = idFromParams;
  if (!id) {
    try {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("replays");
      if (idx !== -1 && parts[idx + 1]) {
        id = parts[idx + 1];
      }
    } catch {
      // ignore
    }
  }
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const { rows } = await pool.query("select raw_json from replays where id=$1", [id]);
  if (!rows.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const replay = rows[0].raw_json;
  let maxLives = 5;
  if (replay?.GenesisModeModel) {
    try {
      const model = JSON.parse(replay.GenesisModeModel);
      if (Number.isFinite(model?.MaxLives)) {
        maxLives = model.MaxLives;
      }
    } catch {
      // ignore
    }
  }
  const actions = replay.Actions || [];
  const battles = actions.filter((a) => a.Type === 0).map((a) => JSON.parse(a.Battle));
  const battleOpponentInfo = actions
    .filter((a) => a.Type === 1)
    .map((a) => JSON.parse(a.Mode).Opponents);

  const parsedBattles = battles.map(getBattleInfo);
  const playerName = battles[0]?.User?.DisplayName || null;
  const headerOpponentName = parsedBattles[0]?.opponentName || null;

  const imageBuffer = await renderReplayImage({
    battles: parsedBattles,
    battleOpponentInfo,
    maxLives,
    includeOdds: false,
    winPercentResults: [],
    playerName,
    headerOpponentName
  });

  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
