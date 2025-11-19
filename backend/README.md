# Backend (Node + Express)

This small server demonstrates how to use `firebase-admin` for server-side operations and exposes example endpoints.

Setup

1. Install dependencies

```bash
cd backend
npm install
```

2. Provide a Firebase service account JSON file. Either set `GOOGLE_APPLICATION_CREDENTIALS` to the path, or place the JSON at `backend/serviceAccountKey.json` and/or set `FIREBASE_SERVICE_ACCOUNT` in `.env`.

3. Run

```bash
node index.js
```

Endpoints

- `GET /api/health` — health check
- `POST /api/calc-payout` — example payout calculation stub (body: `{ leagueId, week }`)
