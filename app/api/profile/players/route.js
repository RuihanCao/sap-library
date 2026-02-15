import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { resolveVersionFilter } from "@/lib/versionFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(rawValue, fallback = 10) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(50, Math.floor(parsed));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
  const limit = parseLimit(searchParams.get("limit"), 10);
  const versionFilterRaw = searchParams.get("version");
  const { versions } = await resolveVersionFilter(pool, versionFilterRaw);

  if (!query) {
    return NextResponse.json({ players: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const values = [`%${query}%`, limit, versions?.length ? versions : null];

  const sql = `
    with source_rows as (
      select
        coalesce(r.player_id, nullif(r.raw_json->>'UserId', '')) as player_id,
        nullif(r.player_name, '') as player_name,
        r.created_at
      from replays r
      where r.match_type != 'arena'
        and ($3::text[] is null or r.game_version = any($3::text[]))

      union all

      select
        coalesce(r.opponent_id, nullif((nullif(r.raw_json->>'GenesisModeModel', '')::jsonb->'Opponents'->0->>'UserId'), '')) as player_id,
        nullif(r.opponent_name, '') as player_name,
        r.created_at
      from replays r
      where r.match_type != 'arena'
        and ($3::text[] is null or r.game_version = any($3::text[]))
    ),
    cleaned as (
      select player_id, player_name, created_at
      from source_rows
      where player_id is not null
        and player_name is not null
    ),
    latest_name as (
      select distinct on (c.player_id)
        c.player_id,
        c.player_name as latest_name,
        c.created_at as last_seen_at
      from cleaned c
      order by c.player_id, c.created_at desc
    ),
    matched_aliases as (
      select
        c.player_id,
        array_agg(distinct c.player_name order by c.player_name) as matched_names
      from cleaned c
      where c.player_name ilike $1
         or c.player_id ilike $1
      group by c.player_id
    )
    select
      ln.player_id,
      ln.latest_name,
      ln.last_seen_at,
      coalesce(ma.matched_names, array[]::text[]) as matched_names
    from latest_name ln
    left join matched_aliases ma on ma.player_id = ln.player_id
    where ma.player_id is not null
       or ln.player_id ilike $1
    order by ln.last_seen_at desc, ln.latest_name asc
    limit $2::int
  `;

  const { rows } = await pool.query(sql, values);
  return NextResponse.json(
    {
      players: rows.map((row) => ({
        playerId: row.player_id,
        latestName: row.latest_name,
        lastSeenAt: row.last_seen_at,
        matchedNames: row.matched_names || []
      }))
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
