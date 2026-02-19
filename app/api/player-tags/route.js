import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensurePlayerTagsTable } from "@/lib/playerTags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePlayerId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeTags(value) {
  let raw = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    raw = value.split(",");
  } else if (value !== null && value !== undefined) {
    raw = [value];
  }

  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const tag = String(item ?? "").trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 200) break;
  }
  return out;
}

async function parseBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function GET(req) {
  await ensurePlayerTagsTable(pool);
  const { searchParams } = new URL(req.url);
  const playerId = normalizePlayerId(searchParams.get("playerId"));
  const tag = String(searchParams.get("tag") || "").trim();
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 100;

  if (playerId) {
    const { rows } = await pool.query(
      `
        select player_id, tags, updated_by, updated_at
        from player_tags
        where player_id = $1
        limit 1
      `,
      [playerId]
    );
    return NextResponse.json({ player: rows[0] || { player_id: playerId, tags: [] } });
  }

  if (tag) {
    const { rows } = await pool.query(
      `
        select player_id, tags, updated_by, updated_at
        from player_tags
        where exists (
          select 1
          from unnest(tags) as t(tag_value)
          where lower(t.tag_value) = lower($1)
        )
        order by updated_at desc
        limit $2
      `,
      [tag, limit]
    );
    return NextResponse.json({ players: rows });
  }

  const { rows } = await pool.query(
    `
      select player_id, tags, updated_by, updated_at
      from player_tags
      order by updated_at desc
      limit $1
    `,
    [limit]
  );
  return NextResponse.json({ players: rows });
}

export async function POST(req) {
  await ensurePlayerTagsTable(pool);
  const body = await parseBody(req);
  const playerId = normalizePlayerId(body?.playerId);
  const tags = normalizeTags(body?.tags);
  const updatedBy = body?.updatedBy ? String(body.updatedBy).trim() : null;

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `
      insert into player_tags (player_id, tags, updated_by, updated_at)
      values ($1, $2::text[], $3, now())
      on conflict (player_id) do update
        set tags = excluded.tags,
            updated_by = excluded.updated_by,
            updated_at = now()
      returning player_id, tags, updated_by, updated_at
    `,
    [playerId, tags, updatedBy]
  );

  return NextResponse.json({ player: rows[0] || null });
}

export async function DELETE(req) {
  await ensurePlayerTagsTable(pool);
  const body = await parseBody(req);
  const { searchParams } = new URL(req.url);
  const playerId = normalizePlayerId(body?.playerId || searchParams.get("playerId"));
  const tag = String(body?.tag || searchParams.get("tag") || "").trim();

  if (!playerId) {
    return NextResponse.json({ error: "playerId required" }, { status: 400 });
  }

  if (!tag) {
    const { rowCount } = await pool.query(
      `
        delete from player_tags
        where player_id = $1
      `,
      [playerId]
    );
    return NextResponse.json({ removed: rowCount > 0, playerId });
  }

  const { rows } = await pool.query(
    `
      update player_tags
      set tags = (
            select coalesce(array_agg(v), '{}'::text[])
            from unnest(tags) as v
            where lower(v) <> lower($2)
          ),
          updated_at = now()
      where player_id = $1
      returning player_id, tags, updated_by, updated_at
    `,
    [playerId, tag]
  );

  if (!rows.length) {
    return NextResponse.json({ removed: false, playerId, tag });
  }

  const row = rows[0];
  if (!row.tags?.length) {
    await pool.query(`delete from player_tags where player_id = $1`, [playerId]);
    return NextResponse.json({ removed: true, playerId, tag, player: { player_id: playerId, tags: [] } });
  }

  return NextResponse.json({ removed: true, playerId, tag, player: row });
}

