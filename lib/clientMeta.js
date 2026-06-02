const EMPTY_OPTIONS = Object.freeze({ pets: [], perks: [], toys: [], packs: [] });
const EMPTY_VERSIONS = Object.freeze({ versions: [], currentVersion: null });
const EMPTY_META = Object.freeze({ ...EMPTY_OPTIONS, ...EMPTY_VERSIONS });

let optionsCache = null;
let optionsPromise = null;
let versionsCache = null;
let versionsPromise = null;

function normalizeOptions(data) {
  return {
    pets: data?.pets || [],
    perks: data?.perks || [],
    toys: data?.toys || [],
    packs: data?.packs || []
  };
}

function normalizeVersions(data) {
  return {
    versions: data?.versions || [],
    currentVersion: data?.currentVersion || null
  };
}

// Static filter options (pets/perks/toys/packs). Fast, cached immutably, and
// independent of the database — fetch this first so filters populate quickly.
export async function fetchClientMetaOptions() {
  if (optionsCache) return optionsCache;
  if (optionsPromise) return optionsPromise;

  optionsPromise = fetch("/api/meta/options")
    .then((res) => (res.ok ? res.json() : EMPTY_OPTIONS))
    .then((data) => normalizeOptions(data))
    .catch(() => EMPTY_OPTIONS)
    .finally(() => {
      optionsPromise = null;
    });

  optionsCache = await optionsPromise;
  return optionsCache;
}

// Dynamic, DB-backed version list. Loads in parallel with the options.
export async function fetchClientMetaVersions() {
  if (versionsCache) return versionsCache;
  if (versionsPromise) return versionsPromise;

  versionsPromise = fetch("/api/meta/versions")
    .then((res) => (res.ok ? res.json() : EMPTY_VERSIONS))
    .then((data) => normalizeVersions(data))
    .catch(() => EMPTY_VERSIONS)
    .finally(() => {
      versionsPromise = null;
    });

  versionsCache = await versionsPromise;
  return versionsCache;
}

// Combined meta (options + versions). Kept for callers that want a single
// object; prefer the split fetches above when you want progressive rendering.
export async function fetchClientMeta() {
  const [options, versions] = await Promise.all([
    fetchClientMetaOptions(),
    fetchClientMetaVersions()
  ]);
  return { ...options, ...versions };
}
