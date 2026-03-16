import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { ensureTopBoardsSchema } = require("@/lib/topBoardsJob");
const { getRunById, getTopItems } = require("@/lib/topBoardsApi");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req, context) {
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

  const { searchParams } = new URL(req.url);
  const side = searchParams.get("side") || "both";
  const pack = searchParams.get("pack") || "";
  const limit = parsePositiveInt(searchParams.get("limit"), 100, 1, 100);

  const items = await getTopItems(pool, runId, {
    side,
    pack: pack || null,
    limit
  });

  return NextResponse.json(
    {
      run,
      total: items.length,
      items
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      }
    }
  );
}
