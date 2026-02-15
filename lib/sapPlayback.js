const { API_VERSION } = require("./config");
const { getAuthToken } = require("./teamwood");

async function fetchParticipationReplay(participationId) {
  const token = await getAuthToken();
  const url = `https://api.teamwood.games/0.${API_VERSION}/api/playback/participation`;

  const makeRequest = async (authToken) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        ParticipationId: participationId,
        Turn: 1,
        Version: API_VERSION
      })
    });

  let res = await makeRequest(token);
  if (res.status === 401) {
    const freshToken = await getAuthToken();
    res = await makeRequest(freshToken);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Replay fetch failed", { status: res.status, body: errorText, participationId });
    throw new Error(`Replay fetch failed: ${res.status}`);
  }

  return res.json();
}

module.exports = {
  fetchParticipationReplay
};
