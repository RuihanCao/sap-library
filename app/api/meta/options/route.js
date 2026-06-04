import { NextResponse } from "next/server";
const { buildMetaOptions } = require("@/lib/metaOptions");

export const runtime = "nodejs";

// Static filter options (pets/perks/toys/packs) built from bundled JSON. No DB,
// so this returns immediately and lets filter dropdowns populate without
// waiting on version/season queries. Cached aggressively since it only changes
// on deploy.
export async function GET() {
  const options = buildMetaOptions();
  return NextResponse.json(options, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000, immutable"
    }
  });
}
