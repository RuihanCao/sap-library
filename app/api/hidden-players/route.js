import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureHiddenPlayersTable } from "@/lib/hiddenPlayers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearStatsCache() {
  const statsCache = globalThis.__sapStatsCache;
  if (statsCache && typeof statsCache.clear === "function") {
    statsCache.clear();
  }
}

function normalizePlayerId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function parseBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function GET(req) {
  await ensureHiddenPlayersTable(pool);
  const { searchParams } = new URL(req.url);
  const playerId = normalizePlayerId(searchParams.get("playerId"));

  if (playerId) {
    const { rows } = await pool.query(
      `
        select player_id, reason, hidden_by, hidden_at
        from hidden_players
        where player_id = $1
        limit 1
      `,
      [playerId]
    );
    return NextResponse.json({ hidden: rows.length > 0, player: rows[0] || null });
  }

  const { rows } = await pool.query(
    `
      select player_id, reason, hidden_by, hidden_at
      from hidden_players
      order by hidden_at desc
    `
  );
  return NextResponse.json({ hiddenPlayers: rows });
}

export async function POST(req) {
  await ensureHiddenPlayersTable(pool);
  const body = await parseBody(req);
  const playerId = normalizePlayerId(body?.playerId);
  const reason = body?.reason ? String(body.reason).trim() : null;
  const hiddenBy = body?.hiddenBy ? String(body.hiddenBy).trim() : null;

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
      insert into hidden_players (player_id, reason, hidden_by, hidden_at)
      values ($1, $2, $3, now())
      on conflict (player_id) do update
        set reason = excluded.reason,
            hidden_by = excluded.hidden_by,
            hidden_at = now()
      returning player_id, reason, hidden_by, hidden_at
    `,
    [playerId, reason, hiddenBy]
  );
  clearStatsCache();

  return NextResponse.json({ hidden: true, player: rows[0] || null });
}

export async function DELETE(req) {
  await ensureHiddenPlayersTable(pool);
  const body = await parseBody(req);
  const { searchParams } = new URL(req.url);
  const playerId = normalizePlayerId(body?.playerId || searchParams.get("playerId"));

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `
      delete from hidden_players
      where player_id = $1
    `,
    [playerId]
  );
  clearStatsCache();

  return NextResponse.json({ hidden: false, removed: rowCount > 0, playerId });
}
