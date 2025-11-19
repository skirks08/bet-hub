// ESPN adapter stub
// NOTE: ESPN leagues typically require scraping or OAuth depending on provider and league type.
// Implementing ESPN import requires understanding the specific league API or HTML structure.

async function importEspnLeague(/* espnLeagueId, db, targetLeagueId */) {
  throw new Error('ESPN adapter not implemented. Requires provider-specific auth and mapping.')
}

module.exports = { importEspnLeague }
