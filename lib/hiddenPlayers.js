const globalForHiddenPlayers = globalThis;

function getEnsurePromise(pool) {
  if (!globalForHiddenPlayers.__hiddenPlayersEnsurePromise) {
    globalForHiddenPlayers.__hiddenPlayersEnsurePromise = pool
      .query(
        `
          create table if not exists hidden_players (
            player_id text primary key,
            reason text,
            hidden_by text,
            hidden_at timestamptz not null default now()
          );
          create index if not exists idx_hidden_players_hidden_at on hidden_players(hidden_at desc);
        `
      )
      .catch((error) => {
        globalForHiddenPlayers.__hiddenPlayersEnsurePromise = null;
        throw error;
      });
  }
  return globalForHiddenPlayers.__hiddenPlayersEnsurePromise;
}

export async function ensureHiddenPlayersTable(pool) {
  await getEnsurePromise(pool);
}

export function hiddenReplayClause(playerIdExpr, opponentIdExpr) {
  return `not exists (
    select 1
    from hidden_players hp
    where hp.player_id = ${playerIdExpr}
       or hp.player_id = ${opponentIdExpr}
  )`;
}
