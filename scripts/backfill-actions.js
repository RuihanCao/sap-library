// Backfill the `actions` table from each replay's stored raw_json.
// Idempotent: insertActions uses ON CONFLICT (replay_id, seq) DO NOTHING, so a
// re-run only fills gaps. Keyset-paginated by id to keep memory and per-query
// time bounded (the DB cancels heavy queries at ~45s).
require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const { parseActions, insertActions } = require("../lib/actions");

const BATCH = Number(process.argv[2]) || 500;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let cursor = "00000000-0000-0000-0000-000000000000";
  let scanned = 0;
  let withActions = 0;
  let totalRows = 0;
  let failed = 0;
  const startedAt = Date.now();

  const fetchBatch = async () => {
    // Skip replays that already have actions so re-runs resume cheaply. Keyset
    // by id keeps each query fast and avoids re-scanning. Retry transient
    // connection/timeout errors instead of letting one blip kill the whole run.
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const { rows } = await client.query(
          `select r.id, r.raw_json
             from replays r
            where r.id > $1
              and not exists (select 1 from actions a where a.replay_id = r.id)
            order by r.id
            limit $2`,
          [cursor, BATCH]
        );
        return rows;
      } catch (err) {
        if (attempt === 5) throw err;
        console.warn(`batch query failed (attempt ${attempt}), retrying: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    return [];
  };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await fetchBatch();
      if (!rows.length) break;
      cursor = rows[rows.length - 1].id;

      for (const row of rows) {
        scanned += 1;
        try {
          const raw = typeof row.raw_json === "string" ? JSON.parse(row.raw_json) : row.raw_json;
          const actionRows = parseActions(raw);
          if (actionRows.length) {
            await insertActions(client, row.id, actionRows);
            withActions += 1;
            totalRows += actionRows.length;
          }
        } catch (err) {
          failed += 1;
          if (failed <= 10) console.warn("parse/insert failed", row.id, err.message);
        }
      }

      const secs = Math.round((Date.now() - startedAt) / 1000);
      console.log(
        `scanned ${scanned} | replays w/ actions ${withActions} | action rows ${totalRows} | failed ${failed} | ${secs}s`
      );
    }

    console.log(`\nDone. Scanned ${scanned} replays, inserted ${totalRows} action rows across ${withActions} replays (${failed} failed).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
