const express = require('express')
const cors = require('cors')
const admin = require('firebase-admin')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

// Initialize firebase-admin. Service account JSON path can be provided via env or default ADC.
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json'
if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  })
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp()
} else {
  console.warn('No service account found. Some backend operations will fail until configured.')
}

const db = admin.firestore ? admin.firestore() : null

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// Example server-side endpoint: simple payout calculation stub
app.post('/api/calc-payout', async (req, res) => {
  // Expect body: { leagueId, week }
  const { leagueId, week } = req.body || {}
  if (!leagueId || !week) return res.status(400).json({ error: 'leagueId and week required' })

  // Real implementation would load bets and compute payouts. Returning a sample response.
  const result = {
    leagueId,
    week,
    payouts: [
      { userId: 'user_1', amount: 50 },
      { userId: 'user_2', amount: -50 }
    ]
  }

  res.json(result)
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Bet-hub backend listening on ${port}`))
