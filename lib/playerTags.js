const globalForPlayerTags = globalThis;

function getEnsurePromise(pool) {
  if (!globalForPlayerTags.__playerTagsEnsurePromise) {
    globalForPlayerTags.__playerTagsEnsurePromise = pool
      .query(
        `
          create table if not exists player_tags (
            player_id text primary key,
            tags text[] not null default '{}'::text[],
            updated_by text,
            updated_at timestamptz not null default now()
          );
          create index if not exists idx_player_tags_tags on player_tags using gin (tags);
          create index if not exists idx_player_tags_updated_at on player_tags(updated_at desc);
        `
      )
      .catch((error) => {
        globalForPlayerTags.__playerTagsEnsurePromise = null;
        throw error;
      });
  }
  return globalForPlayerTags.__playerTagsEnsurePromise;
}

export async function ensurePlayerTagsTable(pool) {
  await getEnsurePromise(pool);
}

