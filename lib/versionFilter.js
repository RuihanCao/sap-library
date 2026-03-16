const VERSION_CACHE_TTL_MS = 60_000;
const FORCED_CURRENT_VERSION = "46";

const globalForVersionCache = globalThis;
const versionCache =
  globalForVersionCache.__sapVersionCache ||
  {
    expiresAt: 0,
    versions: []
  };

if (!globalForVersionCache.__sapVersionCache) {
  globalForVersionCache.__sapVersionCache = versionCache;
}

function parseNumericParts(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)*$/.test(value)) return null;
  return value.split(".").map((part) => Number(part));
}

function normalizeVersionToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^v\d+(?:\.\d+)*$/i.test(text)) {
    return text.slice(1);
  }
  return text;
}

function compareVersionDesc(a, b) {
  const aParts = parseNumericParts(a);
  const bParts = parseNumericParts(b);
  if (aParts && bParts) {
    const len = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < len; i += 1) {
      const aPart = aParts[i] ?? 0;
      const bPart = bParts[i] ?? 0;
      if (aPart !== bPart) return bPart - aPart;
    }
    return 0;
  }
  if (aParts && !bParts) return -1;
  if (!aParts && bParts) return 1;
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" });
}

function parseVersionTokens(rawValue) {
  if (!rawValue) return [];
  return String(rawValue)
    .split(",")
    .map((item) => normalizeVersionToken(item))
    .filter(Boolean);
}

function dedupeStrings(values) {
  return Array.from(new Set(values));
}

export async function getAvailableVersions(pool) {
  const now = Date.now();
  if (versionCache.expiresAt > now) {
    return versionCache.versions;
  }

  const { rows } = await pool.query(
    `
      select distinct game_version
      from replays
      where game_version is not null
        and game_version <> ''
    `
  );

  const versions = dedupeStrings(
    [FORCED_CURRENT_VERSION].concat(
      rows
        .map((row) => normalizeVersionToken(row.game_version))
        .filter(Boolean)
    )
  ).sort(compareVersionDesc);

  versionCache.versions = versions;
  versionCache.expiresAt = now + VERSION_CACHE_TTL_MS;

  return versions;
}

export async function getCurrentVersion(pool) {
  if (FORCED_CURRENT_VERSION) return FORCED_CURRENT_VERSION;
  const versions = await getAvailableVersions(pool);
  return versions[0] || null;
}

export async function resolveVersionFilter(pool, rawValue) {
  const tokens = parseVersionTokens(rawValue);
  const lowered = tokens.map((token) => token.toLowerCase());

  if (lowered.includes("all")) {
    return { versions: null, currentVersion: await getCurrentVersion(pool) };
  }

  if (!tokens.length || lowered.includes("current")) {
    const currentVersion = await getCurrentVersion(pool);
    return { versions: currentVersion ? [currentVersion] : null, currentVersion };
  }

  const versions = dedupeStrings(tokens.map((token) => normalizeVersionToken(token)).filter(Boolean));
  return { versions, currentVersion: await getCurrentVersion(pool) };
}
