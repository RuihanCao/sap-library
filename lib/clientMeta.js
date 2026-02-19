const EMPTY_META = Object.freeze({
  pets: [],
  perks: [],
  toys: [],
  packs: [],
  versions: [],
  currentVersion: null
});

let metaCache = null;
let metaPromise = null;

function normalizeMeta(data) {
  return {
    pets: data?.pets || [],
    perks: data?.perks || [],
    toys: data?.toys || [],
    packs: data?.packs || [],
    versions: data?.versions || [],
    currentVersion: data?.currentVersion || null
  };
}

export async function fetchClientMeta() {
  if (metaCache) return metaCache;
  if (metaPromise) return metaPromise;

  metaPromise = fetch("/api/meta")
    .then((res) => (res.ok ? res.json() : EMPTY_META))
    .then((data) => normalizeMeta(data))
    .catch(() => EMPTY_META)
    .finally(() => {
      metaPromise = null;
    });

  metaCache = await metaPromise;
  return metaCache;
}

