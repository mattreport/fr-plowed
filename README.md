# fr-plowed

Simple Cloudflare app for Fall River residents to:
1. search for their street, and
2. vote whether it is plowed (`yes` / `no`).

## Stack
- Cloudflare Workers (API + server-rendered HTML)
- Cloudflare D1 (street list + vote totals)

## Project files
- `src/worker.js`: Worker app (UI + API routes)
- `schema.sql`: D1 schema
- `seed.sql`: starter street seed data
- `scripts/build_fall_river_streets.py`: converter from official GeoJSON road data -> app-ready JSON

## Local setup

1) Install Wrangler:

```bash
npm install --save-dev wrangler
```

2) Create D1 database and copy resulting `database_id` into `wrangler.toml`.

```bash
npx wrangler d1 create fr-plowed
```

3) Apply schema + seed:

```bash
npx wrangler d1 execute fr-plowed --local --file=schema.sql
npx wrangler d1 execute fr-plowed --local --file=seed.sql
```

4) Run locally:

```bash
npx wrangler dev
```

Then open the local Worker URL and test street search + voting.

## API routes
- `GET /api/streets?q=plea` -> street search
- `POST /api/votes` with JSON `{ "streetId": 1, "isPlowed": true }`
- `GET /api/votes/:streetId` -> current yes/no totals

## Next steps
- Replace `seed.sql` with a full official Fall River street import.
- Add anti-abuse controls (rate limits / anonymous session token).
- Add map view and recency timestamps per vote.
