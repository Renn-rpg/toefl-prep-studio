import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Plan } from './pages/Plan'
import { Listening } from './pages/Listening'
import { Reading } from './pages/Reading'
import { Speaking } from './pages/Speaking'
import { Writing } from './pages/Writing'
import { MockTest } from './pages/MockTest'
import { Evaluation } from './pages/Evaluation'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-parchment">
        <Sidebar />
        <main className="ml-56 flex-1 p-8 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/listening" element={<Listening />} />
            <Route path="/reading" element={<Reading />} />
            <Route path="/speaking" element={<Speaking />} />
            <Route path="/writing" element={<Writing />} />
            <Route path="/mock" element={<MockTest />} />
            <Route path="/evaluation" element={<Evaluation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
