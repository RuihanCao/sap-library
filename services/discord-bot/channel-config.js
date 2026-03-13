const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const globalForDiscordChannelConfig = globalThis;

function getEnsurePromise() {
  if (!globalForDiscordChannelConfig.__discordChannelConfigEnsurePromise) {
    globalForDiscordChannelConfig.__discordChannelConfigEnsurePromise = pool
      .query(
        `
          create table if not exists discord_ingest_channels (
            guild_id text not null,
            channel_id text not null,
            tournament_tag text,
            updated_by text,
            updated_at timestamptz not null default now(),
            primary key (guild_id, channel_id)
          );
          alter table discord_ingest_channels
            add column if not exists tournament_tag text;
          create index if not exists idx_discord_ingest_channels_guild
            on discord_ingest_channels(guild_id);
        `
      )
      .catch((error) => {
        globalForDiscordChannelConfig.__discordChannelConfigEnsurePromise = null;
        throw error;
      });
  }
  return globalForDiscordChannelConfig.__discordChannelConfigEnsurePromise;
}

async function ensureDiscordIngestChannelsTable() {
  await getEnsurePromise();
}

async function listDiscordIngestChannels() {
  await ensureDiscordIngestChannelsTable();
  const res = await pool.query(
    `select guild_id, channel_id, tournament_tag
     from discord_ingest_channels
     order by guild_id asc, channel_id asc`
  );
  return res.rows;
}

async function upsertDiscordIngestChannel({ guildId, channelId, tournamentTag, updatedBy }) {
  await ensureDiscordIngestChannelsTable();
  const res = await pool.query(
    `insert into discord_ingest_channels (guild_id, channel_id, tournament_tag, updated_by, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (guild_id, channel_id) do update
       set tournament_tag = excluded.tournament_tag,
           updated_by = excluded.updated_by,
           updated_at = now()
     returning guild_id, channel_id, tournament_tag`,
    [guildId, channelId, tournamentTag || null, updatedBy || null]
  );
  return res.rows[0] || null;
}

async function deleteDiscordIngestChannel({ guildId, channelId }) {
  await ensureDiscordIngestChannelsTable();
  const res = await pool.query(
    `delete from discord_ingest_channels
     where guild_id = $1 and channel_id = $2
     returning guild_id, channel_id, tournament_tag`,
    [guildId, channelId]
  );
  return res.rows[0] || null;
}

module.exports = {
  ensureDiscordIngestChannelsTable,
  listDiscordIngestChannels,
  upsertDiscordIngestChannel,
  deleteDiscordIngestChannel
};
