create extension if not exists "uuid-ossp";

create table if not exists board_rank_runs (
  id uuid primary key default uuid_generate_v4(),
  config_name text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'failed', 'canceled')),
  created_by text,
  dataset_version text,
  dataset_match_types text[] not null default '{}'::text[],
  dataset_sides text[] not null default '{}'::text[],
  dataset_limit int not null default 4000,
  config jsonb not null,
  stats jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_board_rank_runs_created_at
  on board_rank_runs(created_at desc);
create index if not exists idx_board_rank_runs_status_created_at
  on board_rank_runs(status, created_at desc);

create table if not exists board_rank_boards (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references board_rank_runs(id) on delete cascade,
  source_replay_id uuid not null references replays(id) on delete cascade,
  source_turn_number int not null,
  source_side text not null check (source_side in ('player', 'opponent')),
  board_hash text not null,
  board_pack text,
  board_turn int,
  board_state jsonb not null,
  stage text not null default 'candidate'
    check (stage in ('candidate', 'qualifier', 'semifinal', 'final', 'published')),
  rating float8 not null default 1500,
  qualifier_matches int not null default 0,
  qualifier_wins int not null default 0,
  qualifier_draws int not null default 0,
  semifinal_matches int not null default 0,
  semifinal_wins int not null default 0,
  semifinal_draws int not null default 0,
  final_matches int not null default 0,
  final_wins int not null default 0,
  final_draws int not null default 0,
  final_rank int,
  is_top_100 boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, source_replay_id, source_side),
  unique (run_id, board_hash)
);

create index if not exists idx_board_rank_boards_run_stage
  on board_rank_boards(run_id, stage);
create index if not exists idx_board_rank_boards_run_rank
  on board_rank_boards(run_id, final_rank asc nulls last);
create index if not exists idx_board_rank_boards_run_top
  on board_rank_boards(run_id, is_top_100, final_rank asc nulls last);

create table if not exists board_rank_pairings (
  id bigserial primary key,
  run_id uuid not null references board_rank_runs(id) on delete cascade,
  stage text not null check (stage in ('qualifier', 'semifinal', 'final')),
  board_a_id uuid not null references board_rank_boards(id) on delete cascade,
  board_b_id uuid not null references board_rank_boards(id) on delete cascade,
  simulation_count int not null check (simulation_count > 0),
  board_a_wins int not null default 0,
  board_b_wins int not null default 0,
  draws int not null default 0,
  score_a float8 generated always as (
    (board_a_wins + draws * 0.5) / nullif(simulation_count, 0)
  ) stored,
  score_b float8 generated always as (
    (board_b_wins + draws * 0.5) / nullif(simulation_count, 0)
  ) stored,
  seed int,
  simulated_at timestamptz not null default now(),
  constraint chk_board_rank_pairing_different_boards check (board_a_id <> board_b_id),
  constraint chk_board_rank_pairing_total check (
    board_a_wins + board_b_wins + draws = simulation_count
  )
);

create unique index if not exists idx_board_rank_pairings_unique_pair
  on board_rank_pairings (
    run_id,
    stage,
    least(board_a_id::text, board_b_id::text),
    greatest(board_a_id::text, board_b_id::text)
  );
create index if not exists idx_board_rank_pairings_run_stage
  on board_rank_pairings(run_id, stage, simulated_at desc);
create index if not exists idx_board_rank_pairings_board_a
  on board_rank_pairings(board_a_id);
create index if not exists idx_board_rank_pairings_board_b
  on board_rank_pairings(board_b_id);

create table if not exists board_rank_results (
  run_id uuid not null references board_rank_runs(id) on delete cascade,
  board_id uuid not null references board_rank_boards(id) on delete cascade,
  rank int not null check (rank > 0),
  rating float8 not null,
  win_rate float8 not null check (win_rate >= 0 and win_rate <= 1),
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  matches int not null default 0,
  strength_of_schedule float8,
  created_at timestamptz not null default now(),
  primary key (run_id, board_id),
  unique (run_id, rank)
);

create index if not exists idx_board_rank_results_run_rank
  on board_rank_results(run_id, rank);
create index if not exists idx_board_rank_results_run_win_rate
  on board_rank_results(run_id, win_rate desc);

create table if not exists board_rank_latest (
  scope_key text primary key,
  run_id uuid not null references board_rank_runs(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists idx_board_rank_latest_run_id
  on board_rank_latest(run_id);

create table if not exists board_rank_autorun_state (
  scope_key text primary key,
  pending_replays int not null default 0 check (pending_replays >= 0),
  last_replay_created_at timestamptz,
  last_triggered_run_id uuid references board_rank_runs(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_board_rank_autorun_state_updated_at
  on board_rank_autorun_state(updated_at desc);
