require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { parseReplay } = require("../lib/parse");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "select id, raw_json from replays where opponent_name is null or opponent_name = ''"
    );

    console.log(`Replays to backfill opponent_name: ${rows.length}`);

    let updated = 0;
    for (const row of rows) {
      try {
        const parsed = parseReplay(row.raw_json);
        await client.query(
          "update replays set opponent_name=$1 where id=$2",
          [parsed.opponentName || null, row.id]
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
