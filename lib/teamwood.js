const { API_VERSION } = require("./config");

let cachedToken = null;
let tokenExpiresAt = null;
let loginPromise = null;

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

async function login() {
  if (loginPromise) return loginPromise;
  loginPromise = (async () => {
    const email = process.env.SAP_EMAIL;
    const password = process.env.SAP_PASSWORD;
    if (!email || !password) {
      throw new Error("SAP_EMAIL and SAP_PASSWORD are required for login");
    }
    const res = await fetch(`https://api.teamwood.games/0.${API_VERSION}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        Email: email,
        Password: password,
        Version: API_VERSION
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Teamwood login failed", { status: res.status, body });
      throw new Error(`Login failed: ${res.status}`);
    }
    const json = await res.json();
    cachedToken = json.Token;
    tokenExpiresAt = getTokenExpiry(cachedToken);
    console.log("Teamwood login ok");
    return cachedToken;
  })();

  try {
    return await loginPromise;
  } finally {
    loginPromise = null;
  }
}

async function getAuthToken() {
  if (cachedToken) {
    if (!tokenExpiresAt || tokenExpiresAt - Date.now() > 60_000) {
      return cachedToken;
    }
  }
  return await login();
}

module.exports = {
  getAuthToken,
  login
};
