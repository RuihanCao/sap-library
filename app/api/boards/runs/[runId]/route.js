import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { ensureTopBoardsSchema } = require("@/lib/topBoardsJob");
const { getRunById } = require("@/lib/topBoardsApi");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req, context) {
  await ensureTopBoardsSchema(pool);
  const params = await context?.params;
  const runId = params?.runId;
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const run = await getRunById(pool, runId);
  if (!run) {
    return NextResponse.json({ error: "run not found" }, { status: 404 });
  }

  const [boardCountRes, pairingCountRes, resultCountRes] = await Promise.all([
    pool.query("select count(*)::int as count from board_rank_boards where run_id = $1", [runId]),
    pool.query(
      `
        select
          sum((stage = 'qualifier')::int)::int as qualifier_pairs,
          sum((stage = 'semifinal')::int)::int as semifinal_pairs,
          sum((stage = 'final')::int)::int as final_pairs
        from board_rank_pairings
        where run_id = $1
      `,
      [runId]
    ),
    pool.query("select count(*)::int as count from board_rank_results where run_id = $1", [runId])
  ]);

  return NextResponse.json({
    run: {
      ...run,
      progress: {
        candidateBoards: Number(boardCountRes.rows[0]?.count || 0),
        qualifierPairs: Number(pairingCountRes.rows[0]?.qualifier_pairs || 0),
        semifinalPairs: Number(pairingCountRes.rows[0]?.semifinal_pairs || 0),
        finalPairs: Number(pairingCountRes.rows[0]?.final_pairs || 0),
        finalTopN: Number(resultCountRes.rows[0]?.count || 0)
      }
    }
  });
}
