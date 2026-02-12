import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { parseReplay } = require("@/lib/parse");
const { API_VERSION } = require("@/lib/config");
const { getAuthToken } = require("@/lib/teamwood");
const { rateLimit, applyRateLimitHeaders, rateLimitResponse } = require("@/lib/rateLimit");

export const runtime = "nodejs";

async function fetchReplay(participationId) {
  const token = await getAuthToken();
  const url = `https://api.teamwood.games/0.${API_VERSION}/api/playback/participation`;

  const makeRequest = async (authToken) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        ParticipationId: participationId,
        Turn: 1,
        Version: API_VERSION
      })
    });

  let res = await makeRequest(token);
  if (res.status === 401) {
    const freshToken = await getAuthToken();
    res = await makeRequest(freshToken);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Replay fetch failed", { status: res.status, body: errorText, participationId });
    throw new Error(`Replay fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function POST(req) {
  const limitInfo = rateLimit(req, { keyPrefix: "replay_ingest", limit: 1000, windowMs: 60_000 });
  if (!limitInfo.ok) {
    return rateLimitResponse(limitInfo);
  }

  const { participationId: rawParticipationId } = await req.json();

  if (!rawParticipationId) {
    return NextResponse.json({ error: "participationId required" }, { status: 400 });
  }

  let participationId = rawParticipationId;
  if (typeof participationId === "string") {
    const trimmed = participationId.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.Pid) {
          participationId = parsed.Pid;
        }
      } catch {
        // ignore, keep as-is
      }
    }
  }

  const client = await pool.connect();
  try {
    const existing = await client.query(
      "select id from replays where participation_id=$1",
      [participationId]
    );

    if (existing.rowCount) {
      const res = NextResponse.json({ replayId: existing.rows[0].id, status: "exists" });
      return applyRateLimitHeaders(res, limitInfo);
    }

    const raw = await fetchReplay(participationId);
    const parsed = parseReplay(raw);

    const replayRes = await client.query(
      `insert into replays (
         participation_id,
         player_name,
         opponent_name,
         pack,
         opponent_pack,
         game_version,
         max_lives,
         mode,
         match_type,
         match_name,
         match_pack,
         max_player_count,
         active_player_count,
         spectator_mode,
         raw_json
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning id`,
      [
        participationId,
        parsed.playerName,
        parsed.opponentName,
        parsed.packName,
        parsed.opponentPackName,
        parsed.gameVersion,
        parsed.maxLives,
        parsed.mode,
        parsed.matchType,
        parsed.matchName,
        parsed.matchPack,
        parsed.maxPlayerCount,
        parsed.activePlayerCount,
        parsed.spectatorMode,
        raw
      ]
    );

    const replayId = replayRes.rows[0].id;

    for (const t of parsed.turns) {
      await client.query(
        `insert into turns (
           replay_id,
           turn_number,
           outcome,
           opponent_name,
           player_lives,
           player_gold_spent,
           opponent_gold_spent,
           player_rolls,
           opponent_rolls,
           player_summons,
           opponent_summons
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          replayId,
          t.turn_number,
          t.outcome,
          t.opponent_name,
          t.player_lives,
          t.player_gold_spent,
          t.opponent_gold_spent,
          t.player_rolls,
          t.opponent_rolls,
          t.player_summons,
          t.opponent_summons
        ]
      );
    }

    for (const p of parsed.pets) {
      await client.query(
        `insert into pets (replay_id, turn_number, side, position, pet_name, level, attack, health, perk, toy)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          replayId,
          p.turn_number,
          p.side,
          p.position,
          p.pet_name,
          p.level,
          p.attack,
          p.health,
          p.perk,
          p.toy
        ]
      );
    }

    const res = NextResponse.json({ replayId, status: "inserted" });
    return applyRateLimitHeaders(res, limitInfo);
  } catch (err) {
    const res = NextResponse.json({ error: err.message || "failed" }, { status: 500 });
    return applyRateLimitHeaders(res, limitInfo);
  } finally {
    client.release();
  }
}
