import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { Sidebar } from './components/layout/Sidebar'
import { useCursorGlow } from './hooks/useCursorGlow'
import { Dashboard } from './pages/Dashboard'
import { Plan } from './pages/Plan'
import { Listening } from './pages/Listening'
import { Reading } from './pages/Reading'
import { Speaking } from './pages/Speaking'
import { Writing } from './pages/Writing'
import { MockTest } from './pages/MockTest'
import { Evaluation } from './pages/Evaluation'
import { VocabDashboard } from './pages/VocabDashboard'
import { VocabStudy } from './pages/VocabStudy'

function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/vocab" element={<VocabDashboard />} />
        <Route path="/vocab/study" element={<VocabStudy />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/mock" element={<MockTest />} />
        <Route path="/evaluation" element={<Evaluation />} />
      </Routes>
    </AnimatePresence>
  )
}

function AppShell() {
  useCursorGlow()

  return (
    <div className="flex min-h-screen">
      <div className="cursor-glow" />
      <Sidebar />
      <main className="flex-1 lg:ml-60 pt-16 lg:pt-12 px-4 pb-8 md:px-8 lg:px-10 lg:pb-12 min-h-screen relative">
        <AppRoutes />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
