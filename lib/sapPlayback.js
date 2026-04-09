const { API_VERSION, buildApiVersionCandidates } = require("./config");
const { getAuthContext } = require("./teamwood");

function isVersionMismatchResponse(status, body) {
  return (
    status === 400 &&
    typeof body === "string" &&
    body.toLowerCase().includes("playback is incompatible with the current version")
  );
}

function isVersionProbeMiss(status, body) {
  if (isVersionMismatchResponse(status, body)) return true;
  if (typeof body !== "string") return false;
  const normalized = body.toLowerCase();
  return (
    status === 404 ||
    normalized.includes("needs to be updated") ||
    normalized.includes("please update it to the newest version")
  );
}

async function fetchParticipationReplay(participationId) {
  const makeRequest = async (url, apiVersion, authToken) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        ParticipationId: participationId,
        Turn: 1,
        Version: apiVersion
      })
    });
  let authContext = null;
  try {
    authContext = await getAuthContext();
  } catch (error) {
    console.error("Replay fetch auth failed", {
      participationId,
      apiVersion: API_VERSION,
      error: error?.message || String(error)
    });
    throw error;
  }

  const playbackVersionCandidates = buildApiVersionCandidates(authContext.apiVersion || API_VERSION);
  let lastVersionProbeMiss = null;

  for (const apiVersion of playbackVersionCandidates) {
    const url = `https://api.teamwood.games/0.${apiVersion}/api/playback/participation`;
    let res = await makeRequest(url, apiVersion, authContext.token);
    if (res.status === 401) {
      try {
        authContext = await getAuthContext({ forceRefresh: true });
      } catch (error) {
        console.error("Replay fetch auth refresh failed", {
          participationId,
          apiVersion,
          error: error?.message || String(error)
        });
        throw error;
      }
      res = await makeRequest(url, apiVersion, authContext.token);
    }

    if (res.ok) {
      return res.json();
    }

    const errorText = await res.text();
    if (isVersionProbeMiss(res.status, errorText)) {
      lastVersionProbeMiss = {
        apiVersion,
        status: res.status,
        body: errorText
      };
      continue;
    }

    console.error("Replay fetch failed", {
      status: res.status,
      body: errorText,
      participationId,
      apiVersion
    });
    throw new Error(`Replay fetch failed: ${res.status}`);
  }

  console.error("Replay fetch failed", {
    status: lastVersionProbeMiss?.status || 400,
    body: lastVersionProbeMiss?.body || "Playback is incompatible with the current version.",
    participationId,
    authApiVersion: authContext?.apiVersion || API_VERSION,
    triedApiVersions: playbackVersionCandidates
  });
  if (lastVersionProbeMiss) {
    throw new Error(`Replay fetch failed: ${lastVersionProbeMiss.status}`);
  }
  throw new Error("Replay fetch failed");
}

module.exports = {
  fetchParticipationReplay
};
