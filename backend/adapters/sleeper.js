// Sleeper adapter: fetch league, rosters, and users from Sleeper public API
// Maps into Firestore documents under collection `leagues` and subcollection `teams`.

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

/**
 * importSleeperLeague - imports a Sleeper league into Firestore
 * @param {string} sleeperLeagueId
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} targetLeagueId - optional existing leagueId to update
 */
async function importSleeperLeague(sleeperLeagueId, db, targetLeagueId) {
  if (!db) throw new Error('Firestore instance required')

  const base = 'https://api.sleeper.app/v1'
  const league = await fetchJson(`${base}/league/${sleeperLeagueId}`)
  const rosters = await fetchJson(`${base}/league/${sleeperLeagueId}/rosters`)
  const users = await fetchJson(`${base}/league/${sleeperLeagueId}/users`)

  // Map users by user_id
  const usersById = {}
  users.forEach(u => { usersById[u.user_id] = u })

  // Create or update league doc
  const leagueData = {
    name: league.name || `Sleeper ${sleeperLeagueId}`,
    platform: 'sleeper',
    platformId: sleeperLeagueId,
    settings: league.settings || {},
    metadata: {
      sport: league.sport, season: league.season
    },
    importedAt: new Date().toISOString()
  }

  let leagueRef
  if (targetLeagueId) {
    leagueRef = db.collection('leagues').doc(targetLeagueId)
    await leagueRef.set(leagueData, { merge: true })
  } else {
    leagueRef = await db.collection('leagues').add(leagueData)
  }

  const leagueId = leagueRef.id || (await leagueRef.get()).id

  // Write teams/subcollection from rosters
  const teamsCol = db.collection('leagues').doc(leagueId).collection('teams')

  const batch = db.batch()
  rosters.forEach(r => {
    const owner = usersById[r.owner_id] || {}
    const docRef = teamsCol.doc(String(r.roster_id || r.roster_id === 0 ? r.roster_id : r.owner_id))
    const team = {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      ownerDisplayName: owner.display_name || owner.username || null,
      players: r.players || [],
      settings: r.settings || {},
      drafted: r.drafted || false
    }
    batch.set(docRef, team, { merge: true })
  })

  await batch.commit()

  return { leagueId, imported: true, teamsImported: rosters.length }
}

module.exports = { importSleeperLeague }
