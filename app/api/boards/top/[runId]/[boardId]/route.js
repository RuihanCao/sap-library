import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { ensureTopBoardsSchema } = require("@/lib/topBoardsJob");
const { getRunById, getBoardDetail } = require("@/lib/topBoardsApi");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, context) {
  await ensureTopBoardsSchema(pool);
  const params = await context?.params;
  const runId = params?.runId;
  const boardId = params?.boardId;
  if (!runId || !boardId) {
    return NextResponse.json({ error: "runId and boardId required" }, { status: 400 });
  }

  const run = await getRunById(pool, runId);
  if (!run) {
    return NextResponse.json({ error: "run not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "100";
  const sort = searchParams.get("sort") || "opponentRank";
  const order = searchParams.get("order") || "asc";

  const detail = await getBoardDetail(pool, runId, boardId, {
    limit,
    sort,
    order
  });
  if (!detail) {
    return NextResponse.json({ error: "board not found for run" }, { status: 404 });
  }

  return NextResponse.json({
    runId,
    board: detail.board,
    matchups: detail.matchups
  });
}
