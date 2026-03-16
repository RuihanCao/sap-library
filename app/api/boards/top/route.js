import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCachedPayload, setCachedPayload } from "@/lib/responseCache";
const { ensureTopBoardsSchema } = require("@/lib/topBoardsJob");
const { getLatestRunForScope, getTopItems } = require("@/lib/topBoardsApi");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARDS_TOP_CACHE_TTL_MS = 20_000;
const BOARDS_TOP_CACHE_MAX_KEYS = 200;
const BOARDS_TOP_CACHE_NAMESPACE = "boards-top";

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req) {
  const cacheKey = req.url;
  const cachedPayload = getCachedPayload(BOARDS_TOP_CACHE_NAMESPACE, cacheKey, BOARDS_TOP_CACHE_TTL_MS);
  if (cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        "X-Boards-Cache": "HIT"
      }
    });
  }

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

  const payload = {
    run,
    total: items.length,
    items
  };
  setCachedPayload(BOARDS_TOP_CACHE_NAMESPACE, cacheKey, payload, BOARDS_TOP_CACHE_MAX_KEYS);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
      "X-Boards-Cache": "MISS"
    }
  });
}
