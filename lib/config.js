const path = require('path');

const API_VERSION = "45";

function assetPath(relativePath) {
  return path.join(process.cwd(), relativePath);
}

const PLACEHOLDER_SPRITE = assetPath('i-dunno.png');
const PLACEHOLDER_PERK = assetPath('i-dunno.png');

const BASE_CANVAS_WIDTH = 1250;
const WIN_PERCENT_COLUMN_WIDTH = 260;
const FOOTER_HEIGHT = 60;
const CANVAS_WIDTH = BASE_CANVAS_WIDTH + WIN_PERCENT_COLUMN_WIDTH;
const LUCK_DRAW_WEIGHT = 0.7;
const LUCK_POINTS_MULTIPLIER = 10;
const LUCK_POINTS_CLIP = 50;
const PET_WIDTH = 50;
const BATTLE_HEIGHT = 125;

const A_DAY_IN_MS = 1000 * 60 * 60 * 24;

const BATTLE_OUTCOMES = {
  WIN: 1,
  LOSS: 2,
  TIE: 3
};

const PACK_MAP = {
  0: "Turtle",
  1: "Puppy",
  2: "Star",
  3: "Custom",
  4: "Weekly",
  5: "Golden",
  6: "Unicorn",
  7: "Danger"
};

module.exports = {
  API_VERSION,
  assetPath,
  PLACEHOLDER_SPRITE,
  PLACEHOLDER_PERK,
  BASE_CANVAS_WIDTH,
  WIN_PERCENT_COLUMN_WIDTH,
  FOOTER_HEIGHT,
  CANVAS_WIDTH,
  LUCK_DRAW_WEIGHT,
  LUCK_POINTS_MULTIPLIER,
  LUCK_POINTS_CLIP,
  PET_WIDTH,
  BATTLE_HEIGHT,
  A_DAY_IN_MS,
  BATTLE_OUTCOMES,
  PACK_MAP
};
