const { API_VERSION } = require("./config");

const tokenStateByVersion = new Map();

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    if (payload && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeApiVersion(value) {
  const text = String(value || "").trim();
  return text || String(API_VERSION);
}

function getVersionTokenState(version) {
  const apiVersion = normalizeApiVersion(version);
  let state = tokenStateByVersion.get(apiVersion);
  if (!state) {
    state = {
      cachedToken: null,
      tokenExpiresAt: null,
      loginPromise: null
    };
    tokenStateByVersion.set(apiVersion, state);
  }
  return { apiVersion, state };
}

async function login(version = API_VERSION) {
  const { apiVersion, state } = getVersionTokenState(version);
  if (state.loginPromise) return state.loginPromise;
  state.loginPromise = (async () => {
    const email = process.env.SAP_EMAIL;
    const password = process.env.SAP_PASSWORD;
    if (!email || !password) {
      throw new Error("SAP_EMAIL and SAP_PASSWORD are required for login");
    }
    const res = await fetch(`https://api.teamwood.games/0.${apiVersion}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        Email: email,
        Password: password,
        Version: apiVersion
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Teamwood login failed", { status: res.status, body, apiVersion });
      throw new Error(`Login failed: ${res.status}`);
    }
    const json = await res.json();
    state.cachedToken = json.Token;
    state.tokenExpiresAt = getTokenExpiry(state.cachedToken);
    console.log(`Teamwood login ok (v${apiVersion})`);
    return state.cachedToken;
  })();

  try {
    return await state.loginPromise;
  } finally {
    state.loginPromise = null;
  }
}

async function getAuthToken(version = API_VERSION, options = {}) {
  const { apiVersion, state } = getVersionTokenState(version);
  if (options.forceRefresh) {
    state.cachedToken = null;
    state.tokenExpiresAt = null;
  }
  if (state.cachedToken) {
    if (!state.tokenExpiresAt || state.tokenExpiresAt - Date.now() > 60_000) {
      return state.cachedToken;
    }
  }
  return await login(apiVersion);
}

module.exports = {
  getAuthToken,
  login
};
