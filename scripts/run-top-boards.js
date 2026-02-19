const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const { runTopBoardsOnce, DEFAULT_CONFIG_NAME } = require("../lib/topBoardsJob");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ quiet: true });

function parseArgs(argv) {
  const out = {
    configName: DEFAULT_CONFIG_NAME,
    createdBy: "script",
    overridePath: null,
    force: false
  };

  for (const arg of argv) {
    if (arg.startsWith("--config=")) {
      out.configName = arg.slice("--config=".length).trim() || DEFAULT_CONFIG_NAME;
      continue;
    }
    if (arg.startsWith("--created-by=")) {
      out.createdBy = arg.slice("--created-by=".length).trim() || "script";
      continue;
    }
    if (arg.startsWith("--override=")) {
      out.overridePath = arg.slice("--override=".length).trim() || null;
      continue;
    }
    if (arg === "--force") {
      out.force = true;
      continue;
    }
  }
  return out;
}

function loadOverride(overridePath) {
  if (!overridePath) return null;
  const absolutePath = path.isAbsolute(overridePath)
    ? overridePath
    : path.resolve(process.cwd(), overridePath);
  const text = require("fs").readFileSync(absolutePath, "utf8");
  return JSON.parse(text);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const configOverride = loadOverride(args.overridePath);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await runTopBoardsOnce({
      db: pool,
      configName: args.configName,
      configOverride,
      createdBy: args.createdBy,
      force: args.force,
      logger: console
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "complete") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Top boards run failed:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
