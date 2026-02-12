import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const dbRes = await pool.query("select current_database() as db");
  const countRes = await pool.query("select count(*)::int as count from replays");
  return NextResponse.json(
    {
      database: dbRes.rows[0]?.db || null,
      count: countRes.rows[0]?.count || 0
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
