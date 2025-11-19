import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WeeklyLosers from './pages/WeeklyLosers'
import BetTracker from './pages/BetTracker'
import HallOfShame from './pages/HallOfShame'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}> 
          <Route index element={<Dashboard />} />
          <Route path="login" element={<Login />} />
          <Route path="losers" element={<WeeklyLosers />} />
          <Route path="bets" element={<BetTracker />} />
          <Route path="shame" element={<HallOfShame />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
