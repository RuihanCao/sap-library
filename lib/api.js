const { API_VERSION } = require("./config");

let AUTH_TOKEN = null;
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
    const loginToken = await fetch(`https://api.teamwood.games/0.${API_VERSION}/api/user/login`, {
      method: "POST",
      body: JSON.stringify({
        Email: email,
        Password: password,
        Version: API_VERSION
      }),
      headers: {
        "Content-Type": "application/json; utf-8",
        authority: "api.teamwood.games"
      }
    });
    if (!loginToken.ok) {
      const body = await loginToken.text();
      console.error("Teamwood login failed", { status: loginToken.status, body });
      throw new Error(`Login failed: ${loginToken.status}`);
    }
    const responseJSON = await loginToken.json();
    AUTH_TOKEN = responseJSON["Token"];
    tokenExpiresAt = getTokenExpiry(AUTH_TOKEN);
    console.log("Ready! Logged in");
    return AUTH_TOKEN;
  })();

  try {
    return await loginPromise;
  } finally {
    loginPromise = null;
  }
}

async function getAuthToken() {
  if (AUTH_TOKEN) {
    if (!tokenExpiresAt || tokenExpiresAt - Date.now() > 60_000) {
      return AUTH_TOKEN;
    }
  }
  return await login();
}

async function fetchReplay(participationId) {
  const token = await getAuthToken();
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Authority: "api.teamwood.games",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ParticipationId: participationId,
      Turn: 1,
      Version: API_VERSION
    })
  };
  return fetch(`https://api.teamwood.games/0.${API_VERSION}/api/playback/participation`, options);
}

module.exports = {
  login,
  getAuthToken,
  fetchReplay
};
