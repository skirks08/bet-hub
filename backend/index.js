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

const { importSleeperLeague } = require('./adapters/sleeper')

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// ----- Leagues CRUD -----
app.post('/api/leagues', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  const { name, commissionerId, meta } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name is required' })

  try {
    const ref = await db.collection('leagues').add({
      name,
      commissionerId: commissionerId || null,
      meta: meta || {},
      platform: null,
      platformId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    const doc = await ref.get()
    res.json({ id: ref.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/leagues/:id', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    const doc = await db.collection('leagues').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'not found' })
    res.json({ id: doc.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/leagues/:id', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    await db.collection('leagues').doc(req.params.id).set(req.body, { merge: true })
    const doc = await db.collection('leagues').doc(req.params.id).get()
    res.json({ id: doc.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/leagues/:id', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    await db.collection('leagues').doc(req.params.id).delete()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ----- Bets CRUD (subcollection under league) -----
app.post('/api/leagues/:leagueId/bets', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  const { leagueId } = req.params
  const payload = req.body || {}
  try {
    const ref = await db.collection('leagues').doc(leagueId).collection('bets').add({
      ...payload,
      status: payload.status || 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    const doc = await ref.get()
    res.json({ id: ref.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/leagues/:leagueId/bets', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  const { leagueId } = req.params
  const { week } = req.query
  try {
    let q = db.collection('leagues').doc(leagueId).collection('bets')
    if (week) q = q.where('week', '==', Number(week))
    const snap = await q.orderBy('createdAt', 'desc').get()
    const items = snap.docs.map(d => ({ id: d.id, data: d.data() }))
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/leagues/:leagueId/bets/:betId', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    const doc = await db.collection('leagues').doc(req.params.leagueId).collection('bets').doc(req.params.betId).get()
    if (!doc.exists) return res.status(404).json({ error: 'not found' })
    res.json({ id: doc.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/leagues/:leagueId/bets/:betId', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    await db.collection('leagues').doc(req.params.leagueId).collection('bets').doc(req.params.betId).set(req.body, { merge: true })
    const doc = await db.collection('leagues').doc(req.params.leagueId).collection('bets').doc(req.params.betId).get()
    res.json({ id: doc.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/leagues/:leagueId/bets/:betId', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    await db.collection('leagues').doc(req.params.leagueId).collection('bets').doc(req.params.betId).delete()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ----- Payouts: simple calc and storage -----
app.post('/api/leagues/:leagueId/payouts/calc', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  const { leagueId } = req.params
  const { week } = req.body || {}
  if (week === undefined) return res.status(400).json({ error: 'week is required' })

  try {
    // Load bets for the week and compute a simple sum per user.
    const betsSnap = await db.collection('leagues').doc(leagueId).collection('bets').where('week', '==', Number(week)).get()
    const totals = {}
    betsSnap.docs.forEach(d => {
      const b = d.data()
      // Expect bets to have participants: [{ userId, amount, result: 'win'|'lose' }]
      if (Array.isArray(b.participants)) {
        b.participants.forEach(p => {
          totals[p.userId] = (totals[p.userId] || 0) + (p.amount || 0) * (p.result === 'win' ? 1 : -1)
        })
      }
    })

    const payouts = Object.entries(totals).map(([userId, amount]) => ({ userId, amount }))

    const ref = await db.collection('leagues').doc(leagueId).collection('payouts').add({
      week: Number(week),
      payouts,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    const doc = await ref.get()
    res.json({ id: ref.id, data: doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/leagues/:leagueId/payouts', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  try {
    const snap = await db.collection('leagues').doc(req.params.leagueId).collection('payouts').orderBy('createdAt', 'desc').get()
    res.json(snap.docs.map(d => ({ id: d.id, data: d.data() })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ----- Import adapters -----
// Sleeper import: expects { sleeperLeagueId, targetLeagueId (optional) }
app.post('/api/import/sleeper', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firestore not initialized' })
  const { sleeperLeagueId, targetLeagueId } = req.body || {}
  if (!sleeperLeagueId) return res.status(400).json({ error: 'sleeperLeagueId required' })
  try {
    const result = await importSleeperLeague(sleeperLeagueId, db, targetLeagueId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Bet-hub backend listening on ${port}`))
