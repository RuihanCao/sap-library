# SAP Replay Explorer

Web app that ingests Super Auto Pets replays by participation ID, stores them in Postgres, and lets you search by player, pack, pets, perks, or turn. It also renders the replay summary image using the original bot renderer.

## Setup

1) Install dependencies:
```powershell
npm install
```

2) Create `.env.local`:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
SAP_EMAIL=your_sap_email
SAP_PASSWORD=your_sap_password
```

3) Create tables:
```powershell
psql $env:DATABASE_URL -f schema.sql
```

If you already created tables, run this once in Neon SQL editor:
```sql
alter table replays add column if not exists game_version text;
alter table replays add column if not exists opponent_pack text;
create index if not exists idx_replays_game_version on replays(game_version);
create index if not exists idx_replays_opponent_pack on replays(opponent_pack);
```

4) Run dev server:
```powershell
npm run dev
```

Open `http://localhost:3000`.

## API

- `POST /api/replays` with `{ "participationId": "..." }` to ingest a replay
- `GET /api/search?player=...&pack=...&pet=...&perk=...&turn=...` to search
- `GET /api/replays/:id/image` to render a replay image

## Notes

- `canvas` may require build tools on Windows.
- The app logs into Teamwood to fetch a bearer token automatically using `SAP_EMAIL` and `SAP_PASSWORD`.
