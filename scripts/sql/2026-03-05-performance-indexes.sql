create extension if not exists pg_trgm;

create index if not exists idx_replays_player_name_trgm
  on replays using gin (player_name gin_trgm_ops);

create index if not exists idx_replays_opponent_name_trgm
  on replays using gin (opponent_name gin_trgm_ops);

create index if not exists idx_replays_match_name_trgm
  on replays using gin (match_name gin_trgm_ops);

create index if not exists idx_replays_created_at_desc
  on replays(created_at desc);

create index if not exists idx_replays_player_id_created_at
  on replays(player_id, created_at desc);

create index if not exists idx_replays_opponent_id_created_at
  on replays(opponent_id, created_at desc);

create index if not exists idx_turns_replay_turn_desc
  on turns(replay_id, turn_number desc) include (outcome);
