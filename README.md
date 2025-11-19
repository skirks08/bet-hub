# bet-hub

Monorepo scaffold for Bet Hub — a fantasy football league betting tracker.

Contents:
- `frontend/` — React + Vite + TypeScript frontend using Firebase client for Auth/Firestore.
- `backend/` — Node.js + Express sample server using `firebase-admin` for server-side logic.

Quick start (local dev):

1. Create a Firebase project and enable Authentication (Email) and Firestore.
2. Add your Firebase config to `frontend/.env` (use `frontend/.env.example` as a guide).
3. Download a Firebase service account JSON and set `GOOGLE_APPLICATION_CREDENTIALS` or place it in `backend/serviceAccountKey.json` and update `backend/.env`.
4. From repo root, run:

```bash
# frontend
cd frontend
npm install
npm run dev

# in a separate terminal: backend
cd ../backend
npm install
node index.js
```

This repository contains minimal starter code and examples for authentication, basic pages, Firestore usage, and a small express backend. Use it as a starting point for the features you described: weekly losers, bet tracking, side pots, punishments, payout calculations, and a Hall of Shame.
