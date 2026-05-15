const { API_VERSION } = require("./config");
const { getAuthContext } = require("./teamwood");

const HISTORY_ID_KEYS = new Set([
  "ParticipationId",
  "participationId",
  "participation_id",
  "Pid",
  "pid"
]);

function normalizeHistoryResponse(value) {
  if (!value || typeof value !== "object") {
    return {
      History: [],
      HallFame: []
    };
  }

  return {
    History: Array.isArray(value.History) ? value.History : [],
    HallFame: Array.isArray(value.HallFame) ? value.HallFame : []
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function collectParticipationIds(value, out = new Set()) {
  if (!value || typeof value !== "object") return out;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectParticipationIds(item, out);
    }
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    if (HISTORY_ID_KEYS.has(key) && isUuid(child)) {
      out.add(String(child).trim());
      continue;
    }
    if (child && typeof child === "object") {
      collectParticipationIds(child, out);
    }
  }

  return out;
}

function extractHistoryParticipationIds(historyResponse) {
  const normalized = normalizeHistoryResponse(historyResponse);
  return Array.from(
    collectParticipationIds([normalized.History, normalized.HallFame])
  );
}

async function fetchTeamwoodHistory(options = {}) {
  const authContext = await getAuthContext(options.auth || {});
  const apiVersion = authContext.apiVersion || API_VERSION;
  const res = await fetch(`https://api.teamwood.games/0.${apiVersion}/api/history/fetch`, {
    method: "GET",
    headers: {
      accept: "*/*",
      authorization: `Bearer ${authContext.token}`,
      "device-id": options.deviceId || "00000000-0000-0000-0000-000000000000",
      language: options.language || "en"
    }
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Teamwood history fetch failed", {
      status: res.status,
      body: text,
      apiVersion
    });
    throw new Error(`History fetch failed: ${res.status}`);
  }

  try {
    return {
      apiVersion,
      history: normalizeHistoryResponse(JSON.parse(text))
    };
  } catch {
    throw new Error("History fetch returned invalid JSON");
  }
}

module.exports = {
  extractHistoryParticipationIds,
  fetchTeamwoodHistory,
  normalizeHistoryResponse
};
