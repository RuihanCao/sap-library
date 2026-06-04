const { API_VERSION, buildApiVersionCandidates } = require("./config");

let cachedToken = null;
let tokenExpiresAt = null;
let loginPromise = null;
let resolvedApiVersion = null;

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

function isVersionProbeMiss(status, body) {
  if (status === 404) return true;
  if (typeof body !== "string") return false;
  const normalized = body.toLowerCase();
  return (
    normalized.includes("needs to be updated") ||
    normalized.includes("please update it to the newest version")
  );
}

async function tryLogin(apiVersion) {
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
    if (isVersionProbeMiss(res.status, body)) {
      return { ok: false, apiVersion, status: res.status, body };
    }
    console.error("Teamwood login failed", { status: res.status, body, apiVersion });
    throw new Error(`Login failed: ${res.status}`);
  }

  const json = await res.json();
  return {
    ok: true,
    apiVersion,
    token: json.Token
  };
}

async function login(baseVersion = resolvedApiVersion || API_VERSION) {
  if (loginPromise) return loginPromise;
  loginPromise = (async () => {
    const candidates = buildApiVersionCandidates(baseVersion);
    let lastProbeMiss = null;

    for (const apiVersion of candidates) {
      const result = await tryLogin(apiVersion);
      if (!result.ok) {
        lastProbeMiss = result;
        continue;
      }

      cachedToken = result.token;
      tokenExpiresAt = getTokenExpiry(cachedToken);
      resolvedApiVersion = result.apiVersion;
      console.log(`Teamwood login ok (v${resolvedApiVersion})`);
      return {
        token: cachedToken,
        apiVersion: resolvedApiVersion
      };
    }

    console.error("Teamwood login failed", {
      apiVersion: baseVersion,
      triedApiVersions: candidates,
      lastProbeMiss
    });
    throw new Error(
      `Login failed: ${lastProbeMiss?.status || "no-compatible-version"}`
    );
  })();

  try {
    return await loginPromise;
  } finally {
    loginPromise = null;
  }
}

async function getAuthContext(options = {}) {
  if (options.forceRefresh) {
    cachedToken = null;
    tokenExpiresAt = null;
  }
  if (cachedToken) {
    if (!tokenExpiresAt || tokenExpiresAt - Date.now() > 60_000) {
      return {
        token: cachedToken,
        apiVersion: resolvedApiVersion || API_VERSION
      };
    }
  }
  return await login();
}

async function getAuthToken(options = {}) {
  const context = await getAuthContext(options);
  return context.token;
}

function getResolvedApiVersion() {
  return resolvedApiVersion || API_VERSION;
}

module.exports = {
  getAuthContext,
  getAuthToken,
  getResolvedApiVersion,
  login
};
