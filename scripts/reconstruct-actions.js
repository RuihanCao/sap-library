// Proof-of-concept: reconstruct a human-readable play-by-play of every action a
// player took in a game, straight from the stored replay raw_json.
//
// Decoded action Types (SAP Teamwood playback):
//   4  = Start turn (shop dealt)
//   5  = Roll shop
//   6  = Buy / move minion to a board position (MinionId + Point)
//   7  = Buy & merge / combine (SourceMinionId -> TargetMinionId)
//   8  = Buy food / use consumable (SpellId aimed at a target)
//   9  = Sell minion (Minion, no position)
//   11 = End turn (final BoardOrders -> battle)
//   12 = Set team name (Adjective + Noun)
//   0  = Battle (full board + shop snapshot in Build)
//   1  = Mode update (opponents, rank)
//   2  = Match result (points / rank delta)
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { PETS, FOODS } = require("../lib/data");

const tryP = (v) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};
const petName = (enu) => (PETS[String(enu)] ? PETS[String(enu)].Name : `pet#${enu}`);
const foodName = (enu) => (FOODS[String(enu)] ? FOODS[String(enu)].Name : `food#${enu}`);
const uni = (id) => (id && id.Uni !== undefined ? id.Uni : "?");

// Build a Uni -> species name map from every snapshot we can see.
function buildUniMap(raw) {
  const map = new Map();
  const learn = (item, namer) => {
    if (!item || item.Id === undefined) return;
    const u = item.Id.Uni;
    if (u === undefined) return;
    if (!map.has(u)) map.set(u, namer(item.Enu));
  };
  const learnBuild = (b) => {
    if (!b) return;
    for (const m of b?.Mins?.Items || []) learn(m, (e) => petName(e));
    for (const m of b?.MiSh || []) learn(m, (e) => petName(e));
    for (const s of b?.SpSh || []) learn(s, (e) => foodName(e));
  };
  learnBuild(tryP(raw.GenesisBuildModel)?.Bor);
  for (const a of raw.Actions || []) {
    if (a.Type === 0) learnBuild(tryP(a.Build)?.Bor);
    if (a.Type === 1) {
      const opp = tryP(a.Mode)?.Opponents || [];
      for (const o of opp) for (const m of o.Minions || []) learn(m, (e) => petName(e));
    }
  }
  return map;
}

async function main() {
  const pid = process.argv[2] || null;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = pid
    ? "select participation_id, player_name, raw_json from replays where participation_id=$1 limit 1"
    : "select participation_id, player_name, raw_json from replays order by created_at desc limit 1";
  const res = await pool.query(sql, pid ? [pid] : []);
  const row = res.rows[0];
  const raw = typeof row.raw_json === "string" ? JSON.parse(row.raw_json) : row.raw_json;
  const U = buildUniMap(raw);
  const name = (id) => `${U.get(uni(id)) || `unit#${uni(id)}`} (u${uni(id)})`;

  console.log(`Replay ${row.participation_id} — ${row.player_name}\n`);

  const gen = tryP(raw.GenesisBuildModel)?.Bor;
  if (gen) {
    const shop = (gen.MiSh || []).map((m) => petName(m.Enu)).join(", ");
    const food = (gen.SpSh || []).map((s) => foodName(s.Enu)).join(", ");
    console.log(`OPENING SHOP — pets: [${shop}]${food ? `  food: [${food}]` : ""}  (gold ${gen.Go})\n`);
  }

  let curTurn = null;
  for (const a of raw.Actions || []) {
    if (a.Turn !== curTurn) {
      curTurn = a.Turn;
      console.log(`\n===== TURN ${curTurn} =====`);
    }
    const req = tryP(a.Request);
    switch (a.Type) {
      case 4:
        console.log("  · start turn (shop dealt)");
        break;
      case 5:
        console.log("  · roll shop");
        break;
      case 6:
        console.log(`  · place/buy ${name(req.MinionId)} -> pos ${req.Point?.x ?? "?"}`);
        break;
      case 7:
        console.log(`  · buy & merge ${name(req.SourceMinionId)} into ${name(req.TargetMinionId)}`);
        break;
      case 8:
        console.log(`  · use food ${name(req.SpellId)} on ${name(req.Aim)}`);
        break;
      case 9:
        console.log(`  · sell ${name(req.Minion)}`);
        break;
      case 11: {
        const order = (req.Data?.BoardOrders || []).map((o) => name(o.MinionId));
        console.log(`  · end turn — final order: [${order.join(", ")}]`);
        break;
      }
      case 12:
        console.log(`  · name team "${req.Adjective} ${req.Noun}"`);
        break;
      case 0: {
        const b = tryP(a.Battle);
        const build = tryP(a.Build)?.Bor;
        const outcome = { 1: "WIN", 2: "LOSS", 3: "TIE" }[b?.Outcome] || b?.Outcome;
        const shop = (build?.MiSh || []).map((m) => petName(m.Enu)).join(", ");
        const food = (build?.SpSh || []).map((s) => foodName(s.Enu)).join(", ");
        console.log(`  >> BATTLE vs ${b?.Opponent?.DisplayName || "?"} = ${outcome}`);
        console.log(`     end-of-turn leftover shop: pets[${shop}]${food ? ` food[${food}]` : ""} | gold spent ${build?.GoSp}, rolls ${build?.Rold}`);
        break;
      }
      case 2: {
        const r = tryP(a.Response);
        if (r && r.PointsGained !== undefined) {
          const rank = typeof r.NewRank === "object" ? JSON.stringify(r.NewRank) : r.NewRank;
          console.log(`  · result: points ${r.PointsGained >= 0 ? "+" : ""}${r.PointsGained}, new rank ${rank}`);
        }
        break;
      }
      default:
        break;
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
