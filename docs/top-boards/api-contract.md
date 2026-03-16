# Top Boards API Contract (Draft v1)

This contract is designed to match existing route style in this repo:
- `runtime = "nodejs"`
- `dynamic = "force-dynamic"` for read endpoints that can change frequently
- query params parsed with `URL(req.url).searchParams`
- response shape similar to `/api/stats` and `/api/leaderboard`

## 1) List Runs

### `GET /api/boards/runs`

Returns recent ranking runs.

#### Query params
- `status` (optional): `queued|running|complete|failed|canceled`
- `limit` (optional, default `20`, max `100`)

#### 200 response
```json
{
  "runs": [
    {
      "id": "uuid",
      "configName": "top-boards-v1-default",
      "status": "complete",
      "datasetVersion": "67.4",
      "datasetMatchTypes": ["ranked"],
      "datasetSides": ["player", "opponent"],
      "datasetLimit": 4000,
      "createdAt": "2026-02-19T12:00:00.000Z",
      "startedAt": "2026-02-19T12:00:10.000Z",
      "finishedAt": "2026-02-19T12:34:30.000Z",
      "stats": {
        "candidateBoards": 4000,
        "qualifierPairs": 60000,
        "semifinalPairs": 5000,
        "finalPairs": 4950,
        "finalTopN": 100,
        "simulationErrors": 27
      }
    }
  ]
}
```

## 2) Start a Run (Optional Admin)

### `POST /api/boards/runs`

Queues a new ranking run from a stored config or an override payload.

#### Request body
```json
{
  "configName": "top-boards-v1-default",
  "createdBy": "manual",
  "force": false
}
```

or

```json
{
  "createdBy": "manual",
  "configOverride": {
    "dataset": { "version": "current", "maxBoards": 2000 },
    "stages": { "final": { "topN": 100, "simulationCount": 25 } }
  }
}
```

#### 202 response
```json
{
  "runId": "uuid",
  "status": "queued"
}
```

#### Errors
- `400`: invalid payload
- `401`/`403`: unauthorized (if admin protection enabled)
- `409`: another run in progress for same scope

`force: true` can be used to fail a stale `running` row and immediately queue a new run.

## 3) Get Top Boards (Latest for Scope)

### `GET /api/boards/top`

Returns top boards from latest `complete` run matching filter scope.

#### Query params
- `version` (optional, default `current`)
- `matchType` (optional, default `ranked`)
- `side` (optional, default `both`): `player|opponent|both`
- `limit` (optional, default `100`, max `100`)
- `pack` (optional): board pack filter
- `minTurn` (optional)
- `maxTurn` (optional)

#### 200 response
```json
{
  "run": {
    "id": "uuid",
    "configName": "top-boards-v1-default",
    "status": "complete",
    "createdAt": "2026-02-19T12:00:00.000Z",
    "finishedAt": "2026-02-19T12:34:30.000Z",
    "dataset": {
      "version": "67.4",
      "matchTypes": ["ranked"],
      "sides": ["player", "opponent"],
      "limit": 4000
    },
    "stats": {
      "candidateBoards": 4000,
      "finalTopN": 100
    }
  },
  "total": 100,
  "items": [
    {
      "rank": 1,
      "boardId": "uuid",
      "replayId": "uuid",
      "turnNumber": 15,
      "playerName": "Alice",
      "pack": "Unicorn",
      "rating": 1718.3,
      "winRate": 0.642,
      "wins": 63,
      "losses": 27,
      "draws": 9,
      "matches": 99,
      "strengthOfSchedule": 0.514,
      "preview": {
        "toy": { "name": "RelicFoamSword", "level": 2 },
        "pets": [
          { "slot": 1, "name": "Tyrannosaurus", "attack": 60, "health": 70, "level": 3, "perk": "Melon" },
          { "slot": 2, "name": "Tiger", "attack": 45, "health": 52, "level": 3, "perk": "Steak" }
        ]
      }
    }
  ]
}
```

#### Errors
- `404`: no completed run for requested scope

## 4) Get Top Boards by Run

### `GET /api/boards/top/{runId}`

Same response shape as `/api/boards/top`, but pinned to a specific run.

#### Query params
- `limit` (optional, default `100`, max `100`)
- `pack` (optional)
- `side` (optional): `player|opponent|both`

## 5) Get Board Detail + Head-to-Head Rows

### `GET /api/boards/top/{runId}/{boardId}`

Returns full board state and matchup rows against other top boards in that run.

#### Query params
- `limit` (optional, default `100`, max `100`) matchup rows to return
- `sort` (optional, default `opponentRank`): `opponentRank|winRate|wins|losses|draws`
- `order` (optional, default `asc`): `asc|desc`

#### 200 response
```json
{
  "runId": "uuid",
  "board": {
    "boardId": "uuid",
    "rank": 7,
    "replayId": "uuid",
    "turnNumber": 14,
    "playerName": "Bob",
    "pack": "Star",
    "rating": 1660.8,
    "winRate": 0.589,
    "wins": 58,
    "losses": 33,
    "draws": 8,
    "matches": 99,
    "state": {}
  },
  "matchups": [
    {
      "opponentBoardId": "uuid",
      "opponentRank": 1,
      "wins": 9,
      "losses": 14,
      "draws": 2,
      "simulationCount": 25,
      "winRate": 0.4
    }
  ]
}
```

#### Errors
- `404`: run or board not found

## 6) Run Progress (Optional)

### `GET /api/boards/runs/{runId}`

Returns run metadata and in-progress counters for UI progress bars.

#### 200 response
```json
{
  "run": {
    "id": "uuid",
    "status": "running",
    "stage": "semifinal",
    "createdAt": "2026-02-19T12:00:00.000Z",
    "startedAt": "2026-02-19T12:00:10.000Z",
    "finishedAt": null,
    "stats": {
      "candidateBoards": 4000,
      "qualifierPairsDone": 60000,
      "qualifierPairsTotal": 60000,
      "semifinalPairsDone": 1530,
      "semifinalPairsTotal": 5000
    }
  }
}
```

## Cache/Headers

- `GET /api/boards/top*`: cache-safe for short TTL, suggested:
  - `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120`
  - optional `X-Top-Boards-Cache: HIT|MISS`
- run progress endpoints should avoid long cache.

## SQL Mapping Notes

- `board_rank_runs` drives run selection and progress.
- `board_rank_results` is the primary source for list endpoints.
- `board_rank_boards.board_state` is returned by detail endpoint.
- `board_rank_pairings` is used for board-vs-board rows.
