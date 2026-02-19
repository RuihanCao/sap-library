# Top Boards Draft (Schema + Job + API)

This folder is the implementation draft for the `Top 100 Boards` feature.

## Files

- `scripts/sql/2026-02-19-top-boards.sql`
  - migration draft for run metadata, candidate boards, pairings, and final rankings
- `configs/top-boards.default.json`
  - default job configuration
- `configs/top-boards.private.json`
  - private-match top boards configuration
- `configs/top-boards.arena.json`
  - arena-match top boards configuration
- `docs/top-boards/api-contract.md`
  - endpoint contract for run list, latest top boards, run-pinned boards, and board detail

## Board State Contract

`board_rank_boards.board_state` is expected to be calculator-ready and stable.

Recommended shape:

```json
{
  "pack": "Unicorn",
  "toy": { "name": "RelicFoamSword", "level": 2 },
  "turn": 15,
  "goldSpent": 28,
  "rollAmount": 11,
  "summonedAmount": 7,
  "level3Sold": 1,
  "transformationAmount": 0,
  "pets": [
    {
      "slot": 1,
      "name": "Tyrannosaurus",
      "attack": 60,
      "health": 70,
      "exp": 5,
      "equipment": "Melon",
      "mana": 0,
      "timesHurt": 2,
      "triggersConsumed": 1,
      "belugaSwallowedPet": null
    }
  ]
}
```

Notes:
- keep slots explicit (`slot: 1..5`) to avoid order ambiguity
- include trigger and swallowed-pet fields when available
- hash board signatures from a canonical serialization of this shape

## Execution Plan (Suggested)

1. Candidate extraction
   - read final turn for selected replays
   - build board state from replay raw JSON (not only `pets` rows)
   - dedupe by board hash
2. Qualifier stage
   - random opponent sampling, low sim count
3. Semifinal stage
   - swiss pairing, medium sim count
4. Final stage
   - top 100 round-robin
5. Publish stage
   - write `board_rank_results`
   - update `board_rank_latest` scope pointer

## Failure Handling

- capture per-stage counters in `board_rank_runs.stats`
- for simulator exceptions, use job policy:
  - retry once
  - then count-as-draw and increment `simulationErrors`
- keep run status `failed` only for fatal failures (DB write, config validation, or crash)

## Auto-Run Policy

Replay ingest now supports automatic run scheduling with this default policy:

- threshold: queue a new run when at least `2000` new replay inserts are observed
- cooldown: do not queue another run until at least `12` hours since the most recent run creation
- safety: skip auto-start if any run is currently `queued` or `running`

This policy is tracked per supported match type (`ranked`, `private`, `arena`) in `board_rank_autorun_state` using `scope_key = matchType=<type>`.

Optional environment overrides:

- `TOP_BOARDS_AUTORUN_ENABLED` (`true`/`false`)
- `TOP_BOARDS_AUTORUN_THRESHOLD` (default `2000`)
- `TOP_BOARDS_AUTORUN_COOLDOWN_HOURS` (default `12`)
- `TOP_BOARDS_AUTORUN_CONFIG` (global fallback config name)
- `TOP_BOARDS_AUTORUN_CONFIG_RANKED` (default `top-boards.default`)
- `TOP_BOARDS_AUTORUN_CONFIG_PRIVATE` (default `top-boards.private`)
- `TOP_BOARDS_AUTORUN_CONFIG_ARENA` (default `top-boards.arena`)
