import React from 'react'
import { Outlet, Link } from 'react-router-dom'

export default function App() {
  return (
    <div>
      <header style={{padding:16, borderBottom:'1px solid #eee'}}>
        <h1>Bet Hub</h1>
        <nav>
          <Link to="/">Dashboard</Link> |
          <Link to="/bets"> Bets</Link> |
          <Link to="/losers"> Weekly Losers</Link> |
          <Link to="/shame"> Hall of Shame</Link>
        </nav>
      </header>
      <main style={{padding:16}}>
        <Outlet />
      </main>
    </div>
  )
}
