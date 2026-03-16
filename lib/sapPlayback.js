const { API_VERSION } = require("./config");
const { getAuthToken } = require("./teamwood");

const PLAYBACK_VERSION_CANDIDATES = Array.from(
  new Set([String(API_VERSION), "45", "44", "43", "42"])
);

function isVersionMismatchResponse(status, body) {
  return (
    status === 400 &&
    typeof body === "string" &&
    body.toLowerCase().includes("playback is incompatible with the current version")
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
  let lastVersionMismatch = null;

  for (const apiVersion of PLAYBACK_VERSION_CANDIDATES) {
    const url = `https://api.teamwood.games/0.${apiVersion}/api/playback/participation`;
    let token = await getAuthToken(apiVersion);
    let res = await makeRequest(url, apiVersion, token);
    if (res.status === 401) {
      token = await getAuthToken(apiVersion, { forceRefresh: true });
      res = await makeRequest(url, apiVersion, token);
    }

    if (res.ok) {
      return res.json();
    }

    const errorText = await res.text();
    if (isVersionMismatchResponse(res.status, errorText)) {
      lastVersionMismatch = {
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
    status: lastVersionMismatch?.status || 400,
    body: lastVersionMismatch?.body || "Playback is incompatible with the current version.",
    participationId,
    triedApiVersions: PLAYBACK_VERSION_CANDIDATES
  });
  throw new Error(`Replay fetch failed: ${lastVersionMismatch?.status || 400}`);
}

module.exports = {
  fetchParticipationReplay
};
