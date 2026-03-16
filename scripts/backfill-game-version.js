require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { parseGameVersion } = require("../lib/parse");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      "select id, game_version, raw_json from replays"
    );

    console.log(`Replays scanned: ${rows.length}`);

    let updated = 0;
    for (const row of rows) {
      const parsedVersion = parseGameVersion(row.raw_json);
      if (!parsedVersion || row.game_version === parsedVersion) continue;

      await client.query("update replays set game_version=$1 where id=$2", [
        parsedVersion,
        row.id
      ]);
      updated += 1;
    }

    console.log(`Updated game_version on ${updated} replays.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
