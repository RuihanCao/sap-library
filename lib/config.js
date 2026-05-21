const fs = require("fs");
const path = require("path");

let runtimeAssetBaseUrl = null;

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeVersionToken(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^v\d+(?:\.\d+)*$/i.test(text)) {
    return text.slice(1);
  }
  return text;
}

const API_VERSION = normalizeVersionToken(process.env.SAP_API_VERSION) || "48";
const CURRENT_GAME_VERSION = normalizeVersionToken(process.env.SAP_CURRENT_VERSION);
const API_VERSION_PROBE_AHEAD = parseNonNegativeInt(process.env.SAP_API_VERSION_PROBE_AHEAD, 2);
const API_VERSION_PROBE_BEHIND = parseNonNegativeInt(process.env.SAP_API_VERSION_PROBE_BEHIND, 8);

function buildApiVersionCandidates(baseVersion = API_VERSION) {
  const normalizedBase = normalizeVersionToken(baseVersion) || API_VERSION;
  if (!/^\d+$/.test(normalizedBase)) {
    return [normalizedBase];
  }

  const major = Number.parseInt(normalizedBase, 10);
  const candidates = [String(major)];
  for (let offset = 1; offset <= API_VERSION_PROBE_AHEAD; offset += 1) {
    candidates.push(String(major + offset));
  }
  for (let offset = 1; offset <= API_VERSION_PROBE_BEHIND; offset += 1) {
    const version = major - offset;
    if (version < 1) break;
    candidates.push(String(version));
  }
  return Array.from(new Set(candidates));
}

function normalizeBaseUrl(url) {
  if (!url || typeof url !== "string") return null;
  return url.replace(/\/+$/, "");
}

function setAssetBaseUrl(url) {
  runtimeAssetBaseUrl = normalizeBaseUrl(url);
}

function inferAssetBaseUrl() {
  if (runtimeAssetBaseUrl) return runtimeAssetBaseUrl;
  if (process.env.ASSET_BASE_URL) return normalizeBaseUrl(process.env.ASSET_BASE_URL);
  if (process.env.VERCEL_URL) return normalizeBaseUrl(`https://${process.env.VERCEL_URL}`);
  return null;
}

function assetPath(relativePath) {
  const normalized = String(relativePath || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");

  const publicPath = path.join(process.cwd(), "public", normalized);
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }

  const baseUrl = inferAssetBaseUrl();
  if (baseUrl) {
    return `${baseUrl}/${normalized}`;
  }

  return path.join(process.cwd(), normalized);
}

const PLACEHOLDER_SPRITE = assetPath("i-dunno.png");
const PLACEHOLDER_PERK = assetPath("i-dunno.png");

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
  CURRENT_GAME_VERSION,
  buildApiVersionCandidates,
  assetPath,
  setAssetBaseUrl,
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
