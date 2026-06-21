const { PETS, FOODS } = require("./data");

// Decode the per-action player log embedded in a replay's raw_json. Each replay
// is a single player's point of view, so every shop action here belongs to the
// replay owner. See scripts/reconstruct-actions.js for the human-readable view.
//
// Action Type enum (SAP Teamwood playback, verified v48):
//   4  start turn   5  roll shop   6  place/buy minion (MinionId + Point)
//   7  buy & merge (SourceMinionId -> TargetMinionId)
//   8  buy food / use consumable (SpellId aimed at Aim)
//   9  sell minion  11 end turn   12 name team
//   0  battle (full board+shop snapshot)   1 mode   2 result
//
// We persist the pet/food-affecting actions: buy, move, merge, buy_merge, sell,
// food. Rolls live in turns.player_rolls already, so they are skipped here.

const FALLBACK_ABILITY_TO_PET_ID = {
  // Some replays omit Enu for Ant but keep ability id 75.
  75: "0"
};

function tryParse(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function petNameFromItem(item) {
  if (!item) return null;
  if (item.Enu !== null && item.Enu !== undefined) {
    return PETS[String(item.Enu)] ? PETS[String(item.Enu)].Name : null;
  }
  for (const ability of item.Abil || []) {
    const mapped = FALLBACK_ABILITY_TO_PET_ID[String(ability?.Enu)];
    if (mapped) return PETS[mapped] ? PETS[mapped].Name : null;
  }
  return null;
}

function foodNameFromItem(item) {
  if (!item || item.Enu === null || item.Enu === undefined) return null;
  return FOODS[String(item.Enu)] ? FOODS[String(item.Enu)].Name : null;
}

function uniOf(id) {
  return id && id.Uni !== undefined && id.Uni !== null ? id.Uni : null;
}

// Resolve unit ids (Uni) to species/food names using every snapshot we can see:
// the opening shop (GenesisBuildModel) plus the end-of-turn board+shop snapshot
// in each Type 0 battle action. Items the player rolled past and never kept are
// not snapshotted, so a minority of ids (esp. mid-turn consumables) stay null.
function buildNameMaps(raw) {
  const petByUni = new Map();
  const foodByUni = new Map();
  const learnBuild = (bor) => {
    if (!bor) return;
    for (const m of bor?.Mins?.Items || []) {
      const u = uniOf(m?.Id);
      if (u !== null && !petByUni.has(u)) petByUni.set(u, petNameFromItem(m));
    }
    for (const m of bor?.MiSh || []) {
      const u = uniOf(m?.Id);
      if (u !== null && !petByUni.has(u)) petByUni.set(u, petNameFromItem(m));
    }
    for (const s of bor?.SpSh || []) {
      const u = uniOf(s?.Id);
      if (u !== null && !foodByUni.has(u)) foodByUni.set(u, foodNameFromItem(s));
    }
  };
  learnBuild(tryParse(raw?.GenesisBuildModel)?.Bor);
  for (const a of raw?.Actions || []) {
    if (a?.Type === 0) learnBuild(tryParse(a.Build)?.Bor);
  }
  return { petByUni, foodByUni };
}

function parseActions(raw) {
  const actions = raw?.Actions || [];
  if (!actions.length) return [];

  const { petByUni, foodByUni } = buildNameMaps(raw);
  const petName = (id) => {
    const u = uniOf(id);
    return u !== null && petByUni.has(u) ? petByUni.get(u) : null;
  };
  const foodName = (id) => {
    const u = uniOf(id);
    return u !== null && foodByUni.has(u) ? foodByUni.get(u) : null;
  };

  // Track which unit ids are currently on the player's board so we can tell a
  // buy (a unit appearing for the first time, i.e. coming from the shop) from a
  // move (repositioning a unit already on the board).
  const boardUnis = new Set();
  const genesisBoard = tryParse(raw?.GenesisBuildModel)?.Bor?.Mins?.Items || [];
  for (const m of genesisBoard) {
    const u = uniOf(m?.Id);
    if (u !== null) boardUnis.add(u);
  }

  const rows = [];
  for (let i = 0; i < actions.length; i += 1) {
    const a = actions[i];
    const req = tryParse(a?.Request);
    const turn = Number.isFinite(a?.Turn) ? a.Turn : null;
    const base = {
      turn_number: turn,
      seq: i,
      action_type: null,
      pet_name: null,
      target_pet_name: null,
      food_name: null,
      position: null
    };

    switch (a?.Type) {
      case 6: {
        if (!req) break;
        const u = uniOf(req.MinionId);
        const isMove = u !== null && boardUnis.has(u);
        if (u !== null) boardUnis.add(u);
        rows.push({
          ...base,
          action_type: isMove ? "move" : "buy",
          pet_name: petName(req.MinionId),
          position: Number.isFinite(req.Point?.x) ? req.Point.x : null
        });
        break;
      }
      case 7: {
        if (!req) break;
        const su = uniOf(req.SourceMinionId);
        const fromBoard = su !== null && boardUnis.has(su);
        if (su !== null) boardUnis.delete(su); // source is consumed into target
        rows.push({
          ...base,
          action_type: fromBoard ? "merge" : "buy_merge",
          pet_name: petName(req.SourceMinionId),
          target_pet_name: petName(req.TargetMinionId)
        });
        break;
      }
      case 8: {
        if (!req) break;
        rows.push({
          ...base,
          action_type: "food",
          food_name: foodName(req.SpellId),
          pet_name: petName(req.Aim)
        });
        break;
      }
      case 9: {
        if (!req) break;
        const u = uniOf(req.Minion);
        if (u !== null) boardUnis.delete(u);
        rows.push({
          ...base,
          action_type: "sell",
          pet_name: petName(req.Minion)
        });
        break;
      }
      default:
        break;
    }
  }
  return rows;
}

const ACTION_COLUMNS = [
  "replay_id",
  "turn_number",
  "seq",
  "action_type",
  "pet_name",
  "target_pet_name",
  "food_name",
  "position"
];

async function insertActions(client, replayId, actionRows) {
  if (!actionRows || !actionRows.length) return;
  const cols = ACTION_COLUMNS.length;
  const placeholders = [];
  const values = [];
  actionRows.forEach((row, i) => {
    const o = i * cols;
    placeholders.push(`(${ACTION_COLUMNS.map((_, c) => `$${o + c + 1}`).join(",")})`);
    values.push(
      replayId,
      row.turn_number,
      row.seq,
      row.action_type,
      row.pet_name,
      row.target_pet_name,
      row.food_name,
      row.position
    );
  });
  await client.query(
    `insert into actions (${ACTION_COLUMNS.join(",")}) values ${placeholders.join(",")}
     on conflict (replay_id, seq) do nothing`,
    values
  );
}

module.exports = {
  parseActions,
  insertActions
};
