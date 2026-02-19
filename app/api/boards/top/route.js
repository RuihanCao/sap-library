import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { ensureTopBoardsSchema } = require("@/lib/topBoardsJob");
const { getLatestRunForScope, getTopItems } = require("@/lib/topBoardsApi");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req) {
  await ensureTopBoardsSchema(pool);
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") || "current";
  const matchType = searchParams.get("matchType") || "ranked";
  const side = searchParams.get("side") || "both";
  const pack = searchParams.get("pack") || "";
  const limit = parsePositiveInt(searchParams.get("limit"), 100, 1, 100);

  const run = await getLatestRunForScope(pool, {
    version,
    matchType,
    side
  });

  if (!run) {
    return NextResponse.json({ error: "no completed run found for scope" }, { status: 404 });
  }

  const items = await getTopItems(pool, run.id, {
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
