const { PETS, PERKS, TOYS } = require("./data");
const { PACK_MAP, API_VERSION } = require("./config");

function getPetName(id) {
  const pet = PETS[String(id)];
  return pet ? pet.Name : "Token Pet";
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

  const gameVersion = String(raw?.Version ?? raw?.Ver ?? API_VERSION);
  const mode = Number.isFinite(raw?.Mode) ? raw.Mode : null;

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
          pet_name: getPetName(petJson.Enu),
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
  parseReplay
};


