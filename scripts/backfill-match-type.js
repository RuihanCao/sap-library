const { Pool } = require("pg");
const { parseReplay } = require("../lib/parse");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows } = await client.query("select id, raw_json from replays");
    let updated = 0;

    for (const row of rows) {
      const parsed = parseReplay(row.raw_json);
      await client.query(
        `update replays
         set mode=$2,
             match_type=$3,
             match_name=$4,
             match_pack=$5,
             max_player_count=$6,
             active_player_count=$7,
             spectator_mode=$8
         where id=$1`,
        [
          row.id,
          parsed.mode,
          parsed.matchType,
          parsed.matchName,
          parsed.matchPack,
          parsed.maxPlayerCount,
          parsed.activePlayerCount,
          parsed.spectatorMode
        ]
      );
      updated += 1;
    }

    console.log(`Updated ${updated} replays`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
