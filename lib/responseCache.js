const globalForResponseCache = globalThis;

if (!globalForResponseCache.__sapResponseCaches) {
  globalForResponseCache.__sapResponseCaches = new Map();
}

function getStore(namespace) {
  const rootStore = globalForResponseCache.__sapResponseCaches;
  if (!rootStore.has(namespace)) {
    rootStore.set(namespace, new Map());
  }
  return rootStore.get(namespace);
}

export function getCachedPayload(namespace, key, ttlMs) {
  const store = getStore(namespace);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.payload;
}

export function setCachedPayload(namespace, key, payload, maxKeys = 200) {
  const store = getStore(namespace);
  if (store.size >= maxKeys) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, {
    timestamp: Date.now(),
    payload
  });
}

export function clearCachedNamespace(namespace) {
  const rootStore = globalForResponseCache.__sapResponseCaches;
  rootStore.delete(namespace);
}
