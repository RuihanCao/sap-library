require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { parseReplay } = require("../lib/parse");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "select id, raw_json from replays where pack is null or pack = '' or opponent_pack is null or opponent_pack = ''"
    );

    console.log(`Replays to backfill: ${rows.length}`);

    let updated = 0;
    for (const row of rows) {
      try {
        const parsed = parseReplay(row.raw_json);
        await client.query(
          "update replays set pack=$1, opponent_pack=$2, game_version=coalesce(game_version, $3) where id=$4",
          [
            parsed.packName || null,
            parsed.opponentPackName || null,
            parsed.gameVersion || null,
            row.id
          ]
        );
        updated += 1;
      } catch (err) {
        console.error(`Failed to backfill replay ${row.id}:`, err.message);
      }
    }

    console.log(`Updated ${updated} replays.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
