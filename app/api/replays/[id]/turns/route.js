import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const COPY_SOURCE_PET_IDS = new Set(["53", "373"]);
const BATTLE_OUTCOME = {
  WIN: 1,
  LOSS: 2
};

function parseJson(input) {
  if (!input) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function readFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toReplayId(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getBattleActions(replay) {
  const actions = Array.isArray(replay?.Actions) ? replay.Actions : [];
  return actions.filter((action) => action?.Type === 0 && action?.Battle);
}

function clampLives(value, maxLives) {
  const lives = readFiniteNumber(value);
  const cap = readFiniteNumber(maxLives);
  if (lives === null) {
    return null;
  }
  if (cap === null || cap <= 0) {
    return Math.max(0, lives);
  }
  return Math.max(0, Math.min(cap, lives));
}

function deriveTurnFlow(battles, maxLives) {
  const cappedMaxLives = clampLives(maxLives, maxLives) ?? 5;
  let userLives = cappedMaxLives;
  let opponentLives = cappedMaxLives;
  let userVictories = 0;
  let opponentVictories = 0;

  return battles.map((battleEntry, index) => {
    // Match replay-image logic: the turn-3 life gain appears on the next shown state.
    if (index === 2) {
      userLives = clampLives(userLives + 1, cappedMaxLives) ?? userLives;
      opponentLives = clampLives(opponentLives + 1, cappedMaxLives) ?? opponentLives;
    }

    const derived = {
      user: {
        lives: userLives,
        victories: userVictories
      },
      opponent: {
        lives: opponentLives,
        victories: opponentVictories
      }
    };

    const outcome = readFiniteNumber(battleEntry?.battle?.Outcome);
    if (outcome === BATTLE_OUTCOME.WIN) {
      userVictories += 1;
      opponentLives = clampLives(opponentLives - 1, cappedMaxLives) ?? opponentLives;
    } else if (outcome === BATTLE_OUTCOME.LOSS) {
      opponentVictories += 1;
      userLives = clampLives(userLives - 1, cappedMaxLives) ?? userLives;
    }

    return {
      ...battleEntry,
      derived
    };
  });
}

function resolveMaxLives(replayRow, raw, battleEntries) {
  const fromReplayRow = readFiniteNumber(replayRow?.max_lives);
  if (fromReplayRow !== null && fromReplayRow > 0) {
    return fromReplayRow;
  }

  const modeModel = parseJson(raw?.GenesisModeModel);
  const fromModeModel = readFiniteNumber(modeModel?.MaxLives);
  if (fromModeModel !== null && fromModeModel > 0) {
    return fromModeModel;
  }

  const firstBattle = battleEntries[0]?.battle;
  const fromBoard = readFiniteNumber(firstBattle?.UserBoard?.LiMa);
  if (fromBoard !== null && fromBoard > 0) {
    return fromBoard;
  }

  return 5;
}

function buildTurnStats(board, derived) {
  const rawVictories = readFiniteNumber(board?.Vic);
  const rawBack = readFiniteNumber(board?.Back);
  const lives = clampLives(derived?.lives, derived?.maxLives);
  const victories = readFiniteNumber(derived?.victories) ?? rawVictories;

  return {
    turn: readFiniteNumber(board?.Tur),
    victories,
    health: lives,
    lives,
    rawVictories,
    rawBack,
    goldSpent: readFiniteNumber(board?.GoSp),
    rolls: readFiniteNumber(board?.Rold),
    summons: readFiniteNumber(board?.MiSu),
    level3Sold: readFiniteNumber(board?.MSFL),
    transformed: readFiniteNumber(board?.TrTT)
  };
}

function buildTurnPet(pet, fallbackSlot) {
  if (!pet || typeof pet !== "object") {
    return null;
  }

  const abilities = Array.isArray(pet.Abil)
    ? pet.Abil
      .filter((ability) => ability && typeof ability === "object")
      .map((ability) => ({
        id: toReplayId(ability.Enu),
        level: readFiniteNumber(ability.Lvl),
        group: readFiniteNumber(ability.Grop),
        triggersConsumed: readFiniteNumber(ability.TrCo)
      }))
    : [];

  return {
    slot: readFiniteNumber(pet?.Poi?.x) ?? fallbackSlot,
    id: toReplayId(pet.Enu),
    level: readFiniteNumber(pet.Lvl),
    experience: readFiniteNumber(pet.Exp),
    perkId: toReplayId(pet.Perk),
    attack: {
      permanent: readFiniteNumber(pet?.At?.Perm),
      temporary: readFiniteNumber(pet?.At?.Temp),
      max: readFiniteNumber(pet?.At?.Max)
    },
    health: {
      permanent: readFiniteNumber(pet?.Hp?.Perm),
      temporary: readFiniteNumber(pet?.Hp?.Temp),
      max: readFiniteNumber(pet?.Hp?.Max)
    },
    mana: readFiniteNumber(pet.Mana),
    cosmetic: readFiniteNumber(pet.Cosm),
    abilities
  };
}

function buildTurnPets(board) {
  const items = Array.isArray(board?.Mins?.Items) ? board.Mins.Items : [];
  return items
    .map((pet, index) => buildTurnPet(pet, index))
    .filter((pet) => pet !== null);
}

function buildTurnRecord(action, battle, fallbackTurn, derivedStats) {
  if (!battle || typeof battle !== "object") {
    return null;
  }

  const userBoard = battle.UserBoard;
  const opponentBoard = battle.OpponentBoard;
  const actionTurn = Number(action?.Turn);
  const inferredTurn =
    readFiniteNumber(userBoard?.Tur) ?? readFiniteNumber(opponentBoard?.Tur);
  const turn =
    Number.isFinite(actionTurn) && actionTurn > 0
      ? actionTurn
      : inferredTurn ?? fallbackTurn;

  return {
    turn,
    user: {
      stats: buildTurnStats(userBoard, derivedStats?.user),
      pets: buildTurnPets(userBoard)
    },
    opponent: {
      stats: buildTurnStats(opponentBoard, derivedStats?.opponent),
      pets: buildTurnPets(opponentBoard)
    }
  };
}

function incrementAbilityOwnerCount(abilityOwnerCounts, abilityId, petId) {
  let petCountById = abilityOwnerCounts.get(abilityId);
  if (!petCountById) {
    petCountById = new Map();
    abilityOwnerCounts.set(abilityId, petCountById);
  }
  petCountById.set(petId, (petCountById.get(petId) || 0) + 1);
}

function collectAbilityOwnerCounts(value, abilityOwnerCounts) {
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      collectAbilityOwnerCounts(entry, abilityOwnerCounts);
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const petId = toReplayId(value.Enu);
  const abilities = value.Abil;
  if (petId && Array.isArray(abilities) && !COPY_SOURCE_PET_IDS.has(petId)) {
    abilities.forEach((ability) => {
      if (!isRecord(ability)) {
        return;
      }
      const abilityId = toReplayId(ability.Enu);
      if (!abilityId) {
        return;
      }
      incrementAbilityOwnerCount(abilityOwnerCounts, abilityId, petId);
    });
  }

  Object.values(value).forEach((entry) => {
    collectAbilityOwnerCounts(entry, abilityOwnerCounts);
  });
}

function pickMostLikelyPetId(petCountById) {
  let bestPetId = null;
  let bestCount = -1;

  for (const [petId, count] of petCountById.entries()) {
    if (
      count > bestCount ||
      (count === bestCount && (bestPetId === null || petId < bestPetId))
    ) {
      bestPetId = petId;
      bestCount = count;
    }
  }

  return bestPetId;
}

function buildReplayAbilityPetMap(replay) {
  const abilityOwnerCounts = new Map();
  const actions = Array.isArray(replay?.Actions) ? replay.Actions : [];

  actions.forEach((action) => {
    const parsedBuild = parseJson(action?.Build);
    const parsedBattle = parseJson(action?.Battle);
    const parsedMode = parseJson(action?.Mode);
    collectAbilityOwnerCounts(parsedBuild, abilityOwnerCounts);
    collectAbilityOwnerCounts(parsedBattle, abilityOwnerCounts);
    collectAbilityOwnerCounts(parsedMode, abilityOwnerCounts);
  });

  collectAbilityOwnerCounts(parseJson(replay?.GenesisBuildModel), abilityOwnerCounts);
  collectAbilityOwnerCounts(parseJson(replay?.GenesisModeModel), abilityOwnerCounts);

  const abilityPetMap = {};
  for (const [abilityId, petCountById] of abilityOwnerCounts.entries()) {
    const petId = pickMostLikelyPetId(petCountById);
    if (petId) {
      abilityPetMap[abilityId] = petId;
    }
  }

  return abilityPetMap;
}

export async function GET(_req, context) {
  const params = await context?.params;
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const replayRes = await client.query(
      `select
         id,
         participation_id,
         player_name,
         opponent_name,
         pack,
         opponent_pack,
         game_version,
         match_type,
         max_lives,
         created_at,
         raw_json
       from replays
       where id = $1`,
      [id]
    );

    if (!replayRes.rowCount) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const replayRow = replayRes.rows[0];
    const raw = replayRow.raw_json;
    if (!raw) {
      return NextResponse.json({ error: "raw_json missing" }, { status: 500 });
    }

    const battleActions = getBattleActions(raw);
    const battleEntries = battleActions
      .map((action) => ({
        action,
        battle: parseJson(action?.Battle)
      }))
      .filter((entry) => entry.battle && typeof entry.battle === "object");

    const maxLives = resolveMaxLives(replayRow, raw, battleEntries);
    const battleFlow = deriveTurnFlow(battleEntries, maxLives);

    const turns = battleFlow
      .map((entry, index) => buildTurnRecord(
        entry.action,
        entry.battle,
        index + 1,
        {
          user: { ...entry.derived.user, maxLives },
          opponent: { ...entry.derived.opponent, maxLives }
        }
      ))
      .filter((turn) => turn !== null)
      .sort((a, b) => a.turn - b.turn);

    const responseData = {
      replayId: replayRow.id,
      participationId: replayRow.participation_id,
      maxLives,
      totalTurns: turns.length,
      turnCount: turns.length,
      turns,
      genesisBuildModel: parseJson(raw.GenesisBuildModel),
      genesisModeModel: parseJson(raw.GenesisModeModel),
      abilityPetMap: buildReplayAbilityPetMap(raw),
      replayMeta: {
        id: replayRow.id,
        participation_id: replayRow.participation_id,
        player_name: replayRow.player_name,
        opponent_name: replayRow.opponent_name,
        pack: replayRow.pack,
        opponent_pack: replayRow.opponent_pack,
        game_version: replayRow.game_version,
        match_type: replayRow.match_type,
        max_lives: maxLives,
        created_at: replayRow.created_at
      },
      replay: {
        id: replayRow.id,
        participation_id: replayRow.participation_id,
        player_name: replayRow.player_name,
        opponent_name: replayRow.opponent_name,
        pack: replayRow.pack,
        opponent_pack: replayRow.opponent_pack,
        game_version: replayRow.game_version,
        match_type: replayRow.match_type,
        max_lives: maxLives,
        created_at: replayRow.created_at
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in /api/replays/:id/turns:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

