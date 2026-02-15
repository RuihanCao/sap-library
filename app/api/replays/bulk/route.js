import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { parseReplay } = require("@/lib/parse");
const { fetchParticipationReplay } = require("@/lib/sapPlayback");
const { rateLimit, applyRateLimitHeaders, rateLimitResponse } = require("@/lib/rateLimit");

export const runtime = "nodejs";

function isFiniteRank(value) {
  return Number.isFinite(value) ? value : null;
}

async function enrichReplayWithOpponentRank(raw, parsed, participationId) {
  let playerRank = isFiniteRank(parsed.playerRank);
  let opponentRank = isFiniteRank(parsed.opponentRank);
  let opponentId = parsed.opponentId || null;
  let opponentParticipationId = parsed.opponentParticipationId || null;

  if (opponentParticipationId && opponentParticipationId !== participationId) {
    try {
      const opponentRaw = await fetchParticipationReplay(opponentParticipationId);
      const opponentParsed = parseReplay(opponentRaw);
      opponentId = opponentParsed.playerId || opponentId;
      if (isFiniteRank(opponentParsed.playerRank) !== null) {
        opponentRank = isFiniteRank(opponentParsed.playerRank);
      }
      if (playerRank === null && isFiniteRank(opponentParsed.opponentRank) !== null) {
        playerRank = isFiniteRank(opponentParsed.opponentRank);
      }
    } catch (error) {
      console.warn("Opponent replay fetch failed during rank enrichment (bulk)", {
        participationId,
        opponentParticipationId,
        error: error?.message || "failed"
      });
    }
  }

  return {
    raw,
    parsed: {
      ...parsed,
      playerRank,
      opponentRank,
      opponentId,
      opponentParticipationId
    }
  };
}

export async function POST(req) {
  const limitInfo = rateLimit(req, { keyPrefix: "replay_bulk", limit: 200, windowMs: 60_000 });
  if (!limitInfo.ok) {
    return rateLimitResponse(limitInfo);
  }

  const { participationIds } = await req.json();

  if (!Array.isArray(participationIds) || participationIds.length === 0) {
    return NextResponse.json({ error: "participationIds array required" }, { status: 400 });
  }

  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  let skippedParticipation = 0;
  let skippedMatch = 0;
  let failed = 0;
  const failedEntries = [];

  try {
    for (const rawId of participationIds) {
      const participationId = String(rawId).trim();
      if (!participationId) continue;

      const existing = await client.query(
        "select id from replays where participation_id=$1",
        [participationId]
      );

      if (existing.rowCount) {
        skipped += 1;
        skippedParticipation += 1;
        continue;
      }

      try {
        const raw = await fetchParticipationReplay(participationId);
        const parsed = parseReplay(raw);
        const enriched = await enrichReplayWithOpponentRank(raw, parsed, participationId);
        const finalRaw = enriched.raw;
        const finalParsed = enriched.parsed;
        const normalizedMatchId =
          (finalParsed.matchType || "").toLowerCase() === "arena" ? null : finalParsed.matchId;
        if (normalizedMatchId) {
          const existingMatch = await client.query(
            "select id from replays where match_id=$1",
            [normalizedMatchId]
          );
          if (existingMatch.rowCount) {
            skipped += 1;
            skippedMatch += 1;
            continue;
          }
        }

        const replayRes = await client.query(
          `insert into replays (
             participation_id,
             match_id,
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
             player_id,
             opponent_id,
             opponent_participation_id,
             player_rank,
             opponent_rank,
             raw_json
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           on conflict do nothing
           returning id`,
          [
            participationId,
            normalizedMatchId,
            finalParsed.playerName,
            finalParsed.opponentName,
            finalParsed.packName,
            finalParsed.opponentPackName,
            finalParsed.gameVersion,
            finalParsed.maxLives,
            finalParsed.mode,
            finalParsed.matchType,
            finalParsed.matchName,
            finalParsed.matchPack,
            finalParsed.maxPlayerCount,
            finalParsed.activePlayerCount,
            finalParsed.spectatorMode,
            finalParsed.playerId,
            finalParsed.opponentId,
            finalParsed.opponentParticipationId,
            finalParsed.playerRank,
            finalParsed.opponentRank,
            finalRaw
          ]
        );
        const replayId = replayRes.rows[0]?.id;
        if (!replayId) {
          const byPid = await client.query(
            "select id from replays where participation_id=$1 limit 1",
            [participationId]
          );
          if (byPid.rowCount) {
            skipped += 1;
            skippedParticipation += 1;
            continue;
          }

          if (normalizedMatchId) {
            const byMatch = await client.query(
              "select id from replays where match_id=$1 limit 1",
              [normalizedMatchId]
            );
            if (byMatch.rowCount) {
              skipped += 1;
              skippedMatch += 1;
              continue;
            }
          }

          failed += 1;
          failedEntries.push({ participationId, reason: "failed to insert replay" });
          continue;
        }

        for (const t of finalParsed.turns) {
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

        for (const p of finalParsed.pets) {
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

        inserted += 1;
      } catch (err) {
        console.error("Bulk ingest failed", { participationId, error: err.message });
        failed += 1;
        failedEntries.push({ participationId, reason: err.message || "failed" });
      }
    }

    const res = NextResponse.json({
      inserted,
      skipped,
      skippedParticipation,
      skippedMatch,
      failed,
      failedEntries
    });
    return applyRateLimitHeaders(res, limitInfo);
  } finally {
    client.release();
  }
}
