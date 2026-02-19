import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
const { ensureTopBoardsSchema, startTopBoardsRun, getTopBoardsRunnerState } = require("@/lib/topBoardsJob");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function GET(req) {
  await ensureTopBoardsSchema(pool);
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").trim().toLowerCase();
  const limit = parsePositiveInt(searchParams.get("limit"), 20, 1, 100);

  const validStatuses = new Set(["queued", "running", "complete", "failed", "canceled"]);
  const statusFilter = validStatuses.has(status) ? status : null;

  const { rows } = await pool.query(
    `
      select
        id,
        config_name,
        status,
        dataset_version,
        dataset_match_types,
        dataset_sides,
        dataset_limit,
        stats,
        error,
        started_at,
        finished_at,
        created_at
      from board_rank_runs
      where ($1::text is null or status = $1::text)
      order by created_at desc
      limit $2
    `,
    [statusFilter, limit]
  );

  return NextResponse.json({
    activeRunId: getTopBoardsRunnerState().activeRunId,
    runs: rows.map((row) => ({
      id: row.id,
      configName: row.config_name,
      status: row.status,
      datasetVersion: row.dataset_version,
      datasetMatchTypes: row.dataset_match_types || [],
      datasetSides: row.dataset_sides || [],
      datasetLimit: Number(row.dataset_limit || 0),
      stats: row.stats || {},
      error: row.error || null,
      startedAt: row.started_at || null,
      finishedAt: row.finished_at || null,
      createdAt: row.created_at || null
    }))
  });
}

export async function POST(req) {
  await ensureTopBoardsSchema(pool);
  const body = await req.json().catch(() => ({}));
  const { searchParams } = new URL(req.url);
  const sync = searchParams.get("sync") === "true";

  try {
    const result = await startTopBoardsRun({
      db: pool,
      configName: body?.configName || undefined,
      configOverride: body?.configOverride || null,
      createdBy: body?.createdBy || "api",
      force: body?.force === true,
      logger: console,
      sync
    });

    return NextResponse.json(
      {
        runId: result.runId,
        status: result.status
      },
      { status: sync ? 200 : 202 }
    );
  } catch (error) {
    if (error?.code === "RUN_IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "run already in progress",
          runId: error.runId || null
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: error?.message || "failed to start run"
      },
      { status: 500 }
    );
  }
}
