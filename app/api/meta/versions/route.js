import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAvailableVersions, getCurrentVersion } from "@/lib/versionFilter";

export const runtime = "nodejs";

// Dynamic, DB-backed slice of meta: the version list + current version. Kept
// separate from the static filter options so the heavy option lists are never
// blocked behind a database round-trip.
export async function GET() {
  let versions = [];
  let currentVersion = null;
  try {
    [versions, currentVersion] = await Promise.all([
      getAvailableVersions(pool),
      getCurrentVersion(pool)
    ]);
  } catch {
    versions = [];
    currentVersion = null;
  }

  return NextResponse.json(
    { versions, currentVersion },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
      }
    }
  );
}
