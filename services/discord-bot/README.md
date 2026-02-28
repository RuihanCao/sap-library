# Discord Bot (MVP)

This bot uploads SAP replays from Discord slash commands and tags them in the same database used by the web app.

## Commands

- `/sap-ping`
- `/sap-upload participation_id:<id|url|payload> tournament:<optional> player:<optional> set:<optional> tags:<optional csv>`
- `/sap-watch-here` (admin: enable auto-ingest in the current channel)
- `/sap-unwatch-here` (admin: disable auto-ingest in the current channel)
- `/sap-watch-list` (admin: list watched channels in this server)

`/sap-upload` will:
1. Ingest replay data by participation ID.
2. Reuse existing parsing/fetch logic from `lib/parse.js` and `lib/sapPlayback.js`.
3. Apply tags to the replay, including Discord source metadata.

Auto-ingest behavior:
1. Run `/sap-watch-here` in a channel you want to monitor.
2. Any message in that channel containing a replay UUID/URL/payload will be ingested.
3. The bot auto-tags the replay with: `summit`, `mini`, `fuji`, and `discord:username:<poster>`.

## Required env vars

Set these in `.env.local` (or your runtime env):

- `DATABASE_URL`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`

Optional:

- `DISCORD_GUILD_ID` (register slash commands only for one guild; faster for development)
- `DISCORD_ALLOWED_GUILD_IDS` (comma-separated allowlist)
- `DISCORD_ALLOWED_CHANNEL_IDS` (comma-separated allowlist)
- `DISCORD_AUTO_INGEST_CHANNEL_IDS` (optional static comma-separated channels to auto-watch, in addition to DB-configured channels)
- `DISCORD_REGISTER_COMMANDS` (`false` to skip auto-registration on startup)

## Run

From repo root:

```bash
npm run bot:discord
```

## Notes

- If command registration appears delayed, use `DISCORD_GUILD_ID` during development.
- Message ingestion requires the bot to have access to message content:
  - Discord Developer Portal -> Bot -> enable **Message Content Intent**
  - Bot invite permissions should include reading messages/history and sending messages in watched channels.
- Rotate your bot token if it was ever exposed.
