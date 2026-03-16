export const LOCAL_PROFILE_KEYS = {
  id: "sap-library.profileId",
  name: "sap-library.profileName",
  winrate: "sap-library.profileWinrate",
  mainPack: "sap-library.profileMainPack",
  mainPackShare: "sap-library.profileMainPackShare",
  rankedSample: "sap-library.profileRankedSample",
  lastSeenAt: "sap-library.profileLastSeenAt",
  trendDelta: "sap-library.profileTrendDelta",
  trendGames: "sap-library.profileTrendGames"
};

export const LOCAL_PROFILE_EVENT = "sap-library.local-profile-updated";

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeWinrate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return num;
}

function normalizeRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 1) return null;
  return num;
}

function normalizeSignedRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < -1 || num > 1) return null;
  return num;
}

function normalizeNonNegativeInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function normalizeTimestamp(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function emitLocalProfileChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_PROFILE_EVENT));
}

export function readLocalProfile() {
  if (typeof window === "undefined") {
    return {
      playerId: null,
      name: null,
      winrate: null,
      mainPack: null,
      mainPackShare: null,
      rankedSample: null,
      lastSeenAt: null,
      trendDelta: null,
      trendGames: null
    };
  }
  const playerId = normalizeText(window.localStorage.getItem(LOCAL_PROFILE_KEYS.id));
  const name = normalizeText(window.localStorage.getItem(LOCAL_PROFILE_KEYS.name));
  const mainPack = normalizeText(window.localStorage.getItem(LOCAL_PROFILE_KEYS.mainPack));
  const winrate = normalizeWinrate(window.localStorage.getItem(LOCAL_PROFILE_KEYS.winrate));
  const mainPackShare = normalizeRate(window.localStorage.getItem(LOCAL_PROFILE_KEYS.mainPackShare));
  const rankedSample = normalizeNonNegativeInt(window.localStorage.getItem(LOCAL_PROFILE_KEYS.rankedSample));
  const lastSeenAt = normalizeTimestamp(window.localStorage.getItem(LOCAL_PROFILE_KEYS.lastSeenAt));
  const trendDelta = normalizeSignedRate(window.localStorage.getItem(LOCAL_PROFILE_KEYS.trendDelta));
  const trendGames = normalizeNonNegativeInt(window.localStorage.getItem(LOCAL_PROFILE_KEYS.trendGames));
  return { playerId, name, winrate, mainPack, mainPackShare, rankedSample, lastSeenAt, trendDelta, trendGames };
}

export function writeLocalProfile(updates = {}) {
  if (typeof window === "undefined") return null;
  const current = readLocalProfile();
  const next = {
    playerId: normalizeText(updates.playerId ?? current.playerId),
    name: normalizeText(updates.name ?? current.name),
    mainPack: normalizeText(updates.mainPack ?? current.mainPack),
    winrate: normalizeWinrate(updates.winrate ?? current.winrate),
    mainPackShare: normalizeRate(updates.mainPackShare ?? current.mainPackShare),
    rankedSample: normalizeNonNegativeInt(updates.rankedSample ?? current.rankedSample),
    lastSeenAt: normalizeTimestamp(updates.lastSeenAt ?? current.lastSeenAt),
    trendDelta: normalizeSignedRate(updates.trendDelta ?? current.trendDelta),
    trendGames: normalizeNonNegativeInt(updates.trendGames ?? current.trendGames)
  };

  const setOrRemove = (key, value) => {
    if (value === null || value === undefined || value === "") {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, String(value));
  };

  setOrRemove(LOCAL_PROFILE_KEYS.id, next.playerId);
  setOrRemove(LOCAL_PROFILE_KEYS.name, next.name);
  setOrRemove(LOCAL_PROFILE_KEYS.mainPack, next.mainPack);
  setOrRemove(LOCAL_PROFILE_KEYS.winrate, next.winrate);
  setOrRemove(LOCAL_PROFILE_KEYS.mainPackShare, next.mainPackShare);
  setOrRemove(LOCAL_PROFILE_KEYS.rankedSample, next.rankedSample);
  setOrRemove(LOCAL_PROFILE_KEYS.lastSeenAt, next.lastSeenAt);
  setOrRemove(LOCAL_PROFILE_KEYS.trendDelta, next.trendDelta);
  setOrRemove(LOCAL_PROFILE_KEYS.trendGames, next.trendGames);
  emitLocalProfileChanged();
  return next;
}

export function clearLocalProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.id);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.name);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.winrate);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.mainPack);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.mainPackShare);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.rankedSample);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.lastSeenAt);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.trendDelta);
  window.localStorage.removeItem(LOCAL_PROFILE_KEYS.trendGames);
  emitLocalProfileChanged();
}
