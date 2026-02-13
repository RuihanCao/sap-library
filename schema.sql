create extension if not exists "uuid-ossp";

create table if not exists replays (
  id uuid primary key default uuid_generate_v4(),
  participation_id text unique not null,
  match_id text,
  player_name text,
  opponent_name text,
  pack text,
  opponent_pack text,
  game_version text,
  max_lives int,
  mode int,
  match_type text,
  match_name text,
  match_pack int,
  max_player_count int,
  active_player_count int,
  spectator_mode int,
  tags text[] default '{}'::text[],
  raw_json jsonb not null,
  created_at timestamptz default now()
);
alter table replays add column if not exists match_id text;

create table if not exists turns (
  id uuid primary key default uuid_generate_v4(),
  replay_id uuid not null references replays(id) on delete cascade,
  turn_number int not null,
  outcome int not null,
  opponent_name text,
  player_lives int,
  player_gold_spent int,
  opponent_gold_spent int,
  player_rolls int,
  opponent_rolls int,
  player_summons int,
  opponent_summons int,
  unique (replay_id, turn_number)
);

create table if not exists pets (
  id uuid primary key default uuid_generate_v4(),
  replay_id uuid not null references replays(id) on delete cascade,
  turn_number int not null,
  side text not null check (side in ('player','opponent')),
  position int,
  pet_name text not null,
  level int,
  attack int,
  health int,
  perk text,
  toy text
);

create index if not exists idx_replays_participation_id on replays(participation_id);
create unique index if not exists idx_replays_match_id_unique on replays(match_id) where match_id is not null;
create index if not exists idx_replays_match_id on replays(match_id);
create index if not exists idx_replays_player_name on replays(player_name);
create index if not exists idx_replays_pack on replays(pack);
create index if not exists idx_replays_opponent_pack on replays(opponent_pack);
create index if not exists idx_replays_game_version on replays(game_version);
create index if not exists idx_replays_opponent_name on replays(opponent_name);
create index if not exists idx_replays_match_type on replays(match_type);
create index if not exists idx_replays_mode on replays(mode);
create index if not exists idx_replays_tags on replays using gin (tags);
create index if not exists idx_turns_turn_number on turns(turn_number);
create index if not exists idx_turns_replay_id on turns(replay_id);
create index if not exists idx_turns_outcome on turns(outcome);
create index if not exists idx_pets_pet_name on pets(pet_name);
create index if not exists idx_pets_perk on pets(perk);
create index if not exists idx_pets_toy on pets(toy);
create index if not exists idx_pets_position on pets(position);
create index if not exists idx_pets_turn_number on pets(turn_number);
create index if not exists idx_pets_replay_id on pets(replay_id);
