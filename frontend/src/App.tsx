import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { PageTransition } from './components/motion/PageTransition'
import { useCursorGlow } from './hooks/useCursorGlow'
import { ToastProvider } from './animations/ToastSystem'
import { ScrollProgress } from './animations/ScrollProgress'
import { ScrollToTopButton } from './animations/ScrollToTopButton'
import { AppEntrance } from './animations/AppEntrance'
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
import { VocabQuiz } from './pages/VocabQuiz'
import { VocabBookmark } from './pages/VocabBookmark'
import { Translation } from './pages/Translation'
import { VocabMastery } from './pages/VocabMastery'

function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/plan" element={<PageTransition><Plan /></PageTransition>} />
        <Route path="/vocab" element={<PageTransition><VocabDashboard /></PageTransition>} />
        <Route path="/vocab/study" element={<PageTransition><VocabStudy /></PageTransition>} />
        <Route path="/vocab/quiz" element={<PageTransition><VocabQuiz /></PageTransition>} />
        <Route path="/vocab/bookmarks" element={<PageTransition><VocabBookmark /></PageTransition>} />
        <Route path="/vocab/mastery" element={<PageTransition><VocabMastery /></PageTransition>} />
        <Route path="/listening" element={<PageTransition><Listening /></PageTransition>} />
        <Route path="/reading" element={<PageTransition><Reading /></PageTransition>} />
        <Route path="/speaking" element={<PageTransition><Speaking /></PageTransition>} />
        <Route path="/writing" element={<PageTransition><Writing /></PageTransition>} />
        <Route path="/mock" element={<PageTransition><MockTest /></PageTransition>} />
        <Route path="/evaluation" element={<PageTransition><Evaluation /></PageTransition>} />
        <Route path="/translation" element={<PageTransition><Translation /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}

function AppShell() {
  useCursorGlow()

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <div className="cursor-glow" />
        <ScrollProgress />
        <Sidebar />
        <main className="flex-1 lg:ml-60 pt-16 lg:pt-12 px-4 pb-8 md:px-8 lg:px-10 lg:pb-12 min-h-screen relative">
          <AppRoutes />
        </main>
        <ScrollToTopButton />
      </div>
    </ToastProvider>
  )
}

export default function App() {
  const [showEntrance, setShowEntrance] = useState(() => {
    // 仅在首次加载时显示进场动画 (非页面刷新时也显示, 因为这是会话级别)
    return true
  })
  const [appReady, setAppReady] = useState(false)

  // 进场动画完成后, AppShell 淡入
  useEffect(() => {
    if (appReady && !showEntrance) return
  }, [appReady, showEntrance])

  const handleEntranceComplete = () => {
    setShowEntrance(false)
    // 短延迟后标记应用就绪, 让 CSS 过渡生效
    requestAnimationFrame(() => {
      setAppReady(true)
    })
  }

  return (
    <BrowserRouter>
      {/* 电影化进场动画 — 仅首次加载 */}
      {showEntrance && <AppEntrance onComplete={handleEntranceComplete} />}

      {/* 主应用 — 进场动画完成后以 fade-in 过渡出现 */}
      <div
        style={{
          opacity: appReady ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}
      >
        {appReady && <AppShell />}
      </div>
    </BrowserRouter>
  )
}
