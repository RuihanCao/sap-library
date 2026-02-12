const path = require('path');
const { PETS, PERKS, TOYS } = require('./data');
const { PLACEHOLDER_SPRITE, PLACEHOLDER_PERK, assetPath } = require('./config');

function getPetInfo(petJSON) {
  const safeNum = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const petId = Number(petJSON["Enu"] ?? 0);
  const petName = PETS[petId] ? PETS[petId].Name : "Token Pet";
  const petLevel = safeNum(petJSON?.["Lvl"], 1);
  const petExperience = safeNum(petJSON?.["Exp"], 0);
  const petAtk = safeNum(petJSON?.["At"]?.["Perm"], 0);
  const petHp = safeNum(petJSON?.["Hp"]?.["Perm"], 0);
  const petTempAtk = safeNum(petJSON?.["At"]?.["Temp"], 0);
  const petTempHp = safeNum(petJSON?.["Hp"]?.["Temp"], 0);
  const petPerkId = petJSON["Perk"] ?? -1;
  const petImagePath = PETS[petId]
    ? assetPath(path.join('Sprite', 'Pets', `${PETS[petId].NameId}.png`))
    : PLACEHOLDER_SPRITE;
  if (petPerkId === -1) {
    return {
      name: petName,
      attack: petAtk,
      health: petHp,
      tempAttack: petTempAtk,
      tempHealth: petTempHp,
      level: petLevel,
      xp: petExperience,
      perk: null,
      imagePath: petImagePath,
      perkImagePath: null
    };
  }
  const perkName = PERKS[petPerkId] ? PERKS[petPerkId].Name : "UNKNOWN PERK";
  const perkImage = PERKS[petPerkId]
    ? assetPath(path.join('Sprite', 'Food', `${PERKS[petPerkId].NameId}.png`))
    : PLACEHOLDER_PERK;
  return {
    name: petName,
    attack: petAtk,
    health: petHp,
    tempAttack: petTempAtk,
    tempHealth: petTempHp,
    level: petLevel,
    xp: petExperience,
    perk: perkName,
    imagePath: petImagePath,
    perkImagePath: perkImage
  };
}

function getBattleInfo(battle) {
  const newBattle = {};
  newBattle.playerBoard = {
    boardPets: [],
    toy: {
      imagePath: null,
      level: 0
    }
  };

  newBattle.oppBoard = {
    boardPets: [],
    toy: {
      imagePath: null,
      level: 0
    }
  };

  newBattle.outcome = battle["Outcome"];
  newBattle.opponentName = battle["Opponent"]["DisplayName"];

  for (const petJSON of battle["UserBoard"]["Mins"]["Items"]) {
    if (petJSON !== null) {
      newBattle.playerBoard.boardPets.push(getPetInfo(petJSON));
    }
  }

  for (const toy of battle["UserBoard"]["Rel"]["Items"]) {
    if (toy !== null && toy["Enu"]) {
      const toyId = toy["Enu"];
      newBattle.playerBoard.toy.imagePath = TOYS[toyId]
        ? assetPath(path.join('Sprite', 'Toys', `${TOYS[toyId].NameId}.png`))
        : PLACEHOLDER_SPRITE;
      newBattle.playerBoard.toy.level = toy["Lvl"];
    }
  }

  for (const petJSON of battle["OpponentBoard"]["Mins"]["Items"]) {
    if (petJSON !== null) {
      newBattle.oppBoard.boardPets.push(getPetInfo(petJSON));
    }
  }

  for (const toy of battle["OpponentBoard"]["Rel"]["Items"]) {
    if (toy !== null && toy["Enu"]) {
      const toyId = toy["Enu"];
      newBattle.oppBoard.toy.imagePath = TOYS[toyId]
        ? assetPath(path.join('Sprite', 'Toys', `${TOYS[toyId].NameId}.png`))
        : PLACEHOLDER_SPRITE;
      newBattle.oppBoard.toy.level = toy["Lvl"];
    }
  }
  return newBattle;
}

module.exports = {
  getBattleInfo,
  getPetInfo
};
