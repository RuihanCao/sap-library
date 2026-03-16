const { PETS, PERKS, TOYS } = require("./data");
const { PACK_MAP, API_VERSION } = require("./config");

function getPetName(id) {
  const pet = PETS[String(id)];
  return pet ? pet.Name : "Token Pet";
}

const FALLBACK_ABILITY_TO_PET_ID = {
  // Some replays omit Enu for Ant but keep ability id 75.
  75: "0"
};

function inferPetIdFromAbilities(petJson) {
  const abilities = petJson?.Abil || [];
  for (const ability of abilities) {
    const mapped = FALLBACK_ABILITY_TO_PET_ID[String(ability?.Enu)];
    if (mapped) return mapped;
  }
  return null;
}

function getPetNameFromJson(petJson) {
  if (!petJson) return "Token Pet";
  if (petJson.Enu !== null && petJson.Enu !== undefined) {
    return getPetName(petJson.Enu);
  }
  const inferredPetId = inferPetIdFromAbilities(petJson);
  if (inferredPetId) {
    return getPetName(inferredPetId);
  }
  return "Token Pet";
}

function getPerkName(id) {
  if (id === null || id === undefined) return null;
  const perk = PERKS[String(id)];
  return perk ? perk.Name : "UNKNOWN PERK";
}

function getToyName(board) {
  const toyItem = (board?.Rel?.Items || []).find((item) => item && item.Enu);
  if (!toyItem) return null;
  const toy = TOYS[String(toyItem.Enu)];
  return toy ? toy.Name : null;
}

function normalizeVersion(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  return null;
}

function asFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function parseActionPayload(payload) {
  if (!payload) return null;
  if (typeof payload === "object") return payload;
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function parseModeModel(raw) {
  if (!raw?.GenesisModeModel) return null;
  try {
    return JSON.parse(raw.GenesisModeModel);
  } catch {
    return null;
  }
}

function parseLatestModeAction(actions) {
  for (let i = actions.length - 1; i >= 0; i -= 1) {
    const action = actions[i];
    if (action?.Type !== 1 || !action?.Mode) continue;
    const parsed = parseActionPayload(action.Mode);
    if (parsed && typeof parsed === "object") return parsed;
  }
  return null;
}

function extractReplayIdentities(raw) {
  const actions = raw?.Actions || [];
  const modeModel = parseModeModel(raw);
  const latestMode = parseLatestModeAction(actions);

  const opponents = Array.isArray(modeModel?.Opponents)
    ? modeModel.Opponents
    : Array.isArray(latestMode?.Opponents)
      ? latestMode.Opponents
      : [];

  const firstOpponent = opponents[0] || null;

  const playerId = raw?.UserId ? String(raw.UserId) : null;
  const opponentId = firstOpponent?.UserId ? String(firstOpponent.UserId) : null;
  const opponentParticipationId = firstOpponent?.ParticipationId
    ? String(firstOpponent.ParticipationId)
    : null;

  const playerRank = asFiniteNumber(modeModel?.Rank) ?? asFiniteNumber(latestMode?.Rank);
  const opponentRank = asFiniteNumber(firstOpponent?.Rank);

  return {
    playerId,
    opponentId,
    opponentParticipationId,
    playerRank,
    opponentRank
  };
}

function parseGameVersion(raw) {
  const topLevelVersion = normalizeVersion(
    raw?.GameVersion ??
      raw?.ClientVersion ??
      raw?.BuildVersion ??
      raw?.Version ??
      raw?.Ver
  );
  if (topLevelVersion) return topLevelVersion;

  const actions = raw?.Actions || [];
  for (const action of actions) {
    const actionVersion = normalizeVersion(action?.Version ?? action?.Ver);
    if (actionVersion) return actionVersion;

    const actionPayloads = [
      action?.Request,
      action?.Response,
      action?.Build,
      action?.Battle,
      action?.Mode
    ];
    for (const payload of actionPayloads) {
      const parsed = parseActionPayload(payload);
      const payloadVersion = normalizeVersion(
        parsed?.GameVersion ??
          parsed?.ClientVersion ??
          parsed?.BuildVersion ??
          parsed?.Version ??
          parsed?.Ver
      );
      if (payloadVersion) return payloadVersion;
    }
  }

  return String(API_VERSION);
}

function parseReplay(raw) {
  const actions = raw?.Actions || [];
  const battles = actions
    .filter((a) => a.Type === 0)
    .map((a) => JSON.parse(a.Battle));

  const firstBattle = battles[0];
  const playerName =
    firstBattle?.User?.DisplayName ||
    firstBattle?.UserBoard?.User?.DisplayName ||
    null;

  const findPackId = (getter) => {
    const direct = getter(firstBattle);
    if (direct !== null && direct !== undefined) return direct;
    for (const battle of battles) {
      const value = getter(battle);
      if (value !== null && value !== undefined) return value;
    }
    return null;
  };

  const packId = findPackId((battle) => battle?.UserBoard?.Pack ?? null);
  const packName = PACK_MAP[packId] ?? (packId !== null ? String(packId) : "Turtle");
  const opponentPackId = findPackId((battle) => battle?.OpponentBoard?.Pack ?? null);
  const opponentPackName = PACK_MAP[opponentPackId] ?? (opponentPackId !== null ? String(opponentPackId) : "Turtle");

  let maxLives = 5;
  let matchName = null;
  let matchPack = null;
  let maxPlayerCount = null;
  let activePlayerCount = null;
  let spectatorMode = null;
  let matchType = null;
  let genesisModel = null;

  if (raw?.GenesisModeModel) {
    try {
      genesisModel = JSON.parse(raw.GenesisModeModel);
      if (Number.isFinite(genesisModel?.MaxLives)) {
        maxLives = genesisModel.MaxLives;
      }
      matchName = genesisModel?.Settings?.MatchName ?? genesisModel?.Name ?? null;
      matchPack = Number.isFinite(genesisModel?.MatchPack) ? genesisModel.MatchPack : null;
      maxPlayerCount = Number.isFinite(genesisModel?.MaxPlayerCount)
        ? genesisModel.MaxPlayerCount
        : null;
      activePlayerCount = Number.isFinite(genesisModel?.ActivePlayerCount)
        ? genesisModel.ActivePlayerCount
        : null;
      spectatorMode = Number.isFinite(genesisModel?.SpectatorMode)
        ? genesisModel.SpectatorMode
        : null;
    } catch {
      // ignore
    }
  }

  const gameVersion = parseGameVersion(raw);
  const mode = Number.isFinite(raw?.Mode) ? raw.Mode : null;
  const matchId = raw?.MatchId ? String(raw.MatchId) : null;
  const identity = extractReplayIdentities(raw);

  const looksPrivate =
    Boolean(matchName) ||
    (Number.isFinite(genesisModel?.Settings?.Players) && genesisModel.Settings.Players > 2) ||
    (Number.isFinite(maxPlayerCount) && maxPlayerCount > 2) ||
    Number.isFinite(spectatorMode);

  if (mode === 1) {
    matchType = "arena";
  } else if (looksPrivate) {
    matchType = "private";
  } else if (mode === 0) {
    matchType = "ranked";
  } else {
    matchType = "unknown";
  }

  const turns = [];
  const pets = [];
  const opponentNames = new Set();

  for (let i = 0; i < battles.length; i++) {
    const battle = battles[i];
    const turnNumber = i + 1;
    const oppName = battle?.Opponent?.DisplayName || null;
    if (oppName) opponentNames.add(oppName);

    const playerBoard = battle?.UserBoard;
    const opponentBoard = battle?.OpponentBoard;

    turns.push({
      turn_number: turnNumber,
      outcome: battle.Outcome,
      opponent_name: oppName,
      player_lives: battle?.User?.Lives ?? null,
      player_gold_spent: playerBoard?.GoSp ?? null,
      opponent_gold_spent: opponentBoard?.GoSp ?? null,
      player_rolls: playerBoard?.Rold ?? null,
      opponent_rolls: opponentBoard?.Rold ?? null,
      player_summons: playerBoard?.MiSu ?? null,
      opponent_summons: opponentBoard?.MiSu ?? null
    });

    const pushBoardPets = (board, side) => {
      const toyName = getToyName(board);
      const items = board?.Mins?.Items || [];
      for (let idx = 0; idx < items.length; idx += 1) {
        const petJson = items[idx];
        if (!petJson) continue;
        let position = petJson?.Poi?.x;
        if (position === undefined || position === null) {
          position = idx;
        }
        pets.push({
          turn_number: turnNumber,
          side,
          position,
          pet_name: getPetNameFromJson(petJson),
          level: petJson.Lvl ?? null,
          attack: petJson.At?.Perm ?? null,
          health: petJson.Hp?.Perm ?? null,
          perk: getPerkName(petJson.Perk ?? null),
          toy: toyName
        });
      }
    };

    pushBoardPets(battle?.UserBoard, "player");
    pushBoardPets(battle?.OpponentBoard, "opponent");
  }

  const opponentName = opponentNames.values().next().value || null;
  return {
    matchId,
    playerId: identity.playerId,
    opponentId: identity.opponentId,
    opponentParticipationId: identity.opponentParticipationId,
    playerRank: identity.playerRank,
    opponentRank: identity.opponentRank,
    playerName,
    opponentName,
    packName,
    opponentPackName,
    gameVersion,
    maxLives,
    mode,
    matchType,
    matchName,
    matchPack,
    maxPlayerCount,
    activePlayerCount,
    spectatorMode,
    turns,
    pets
  };
}

module.exports = {
  parseReplay,
  parseGameVersion,
  extractReplayIdentities
};


