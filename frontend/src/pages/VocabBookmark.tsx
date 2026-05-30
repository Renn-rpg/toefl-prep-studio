import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import gsap from 'gsap'
import type { BookmarkList } from '@/types'
import { ChevronLeft, Star, Search, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { motion, AnimatePresence } from 'motion/react'

export function VocabBookmark() {
  const navigate = useNavigate()
  const [data, setData] = useState<BookmarkList | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // GSAP refs
  const listRef = useRef<HTMLDivElement>(null)
  const starRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const ctxRef = useRef<gsap.Context | null>(null)

  const fetchBookmarks = useCallback(async (p: number, s: string) => {
    const res = await api.get<BookmarkList>(`/vocab/bookmarks?page=${p}&per_page=50&search=${encodeURIComponent(s)}`)
    setData(res)
  }, [])

  useEffect(() => {
    fetchBookmarks(page, search)
  }, [page, search, fetchBookmarks])

  // GSAP: stagger entrance for word list items
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    ctxRef.current?.revert()
    const ctx = gsap.context(() => {
      const items = listEl.querySelectorAll<HTMLElement>('[data-bookmark-item]')
      if (items.length > 0) {
        gsap.from(items, {
          opacity: 0,
          y: 12,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power3.out',
        })
      }
    })
    ctxRef.current = ctx

    return () => ctx.revert()
  }, [data?.words?.map(w => w.id).join(','), page])

  // Cleanup on unmount
  useEffect(() => {
    return () => ctxRef.current?.revert()
  }, [])

  const setStarRef = (id: number) => (el: HTMLButtonElement | null) => {
    if (el) {
      starRefs.current.set(id, el)
    } else {
      starRefs.current.delete(id)
    }
  }

  async function removeBookmark(wordId: number) {
    // GSAP: star scale bounce before removal
    const starEl = starRefs.current.get(wordId)
    if (starEl) {
      gsap.to(starEl, {
        scale: 0.8,
        duration: 0.1,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(starEl, {
            scale: 1.3,
            duration: 0.2,
            ease: 'back.out(2)',
            onComplete: () => {
              gsap.to(starEl, {
                scale: 1,
                duration: 0.15,
                ease: 'power2.out',
              })
            },
          })
        },
      })
    }

    await api.delete(`/vocab/bookmark/${wordId}`)
    fetchBookmarks(page, search)
  }

  const total = data?.total ?? 0
  const words = data?.words ?? []

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/vocab')}
            className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors font-medium">
            <ChevronLeft className="h-4 w-4" /> 返回词汇总览
          </button>
          <span className="text-sm text-slate-500 font-mono">{total} 个词</span>
        </div>

        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-7 w-7 text-pink-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100 mb-1">生词本</h1>
          <p className="text-slate-400 text-sm">收藏的词汇，集中浏览和复习</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索已收藏的词汇…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-500/30"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {words.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {search ? '没有匹配的收藏词汇' : '还没有收藏的单词'}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {search ? '试试其他关键词' : '在学习或答题时点击星标即可收藏'}
            </p>
          </div>
        ) : (
          <div ref={listRef} className="space-y-2">
            <AnimatePresence>
              {words.map(w => (
                <motion.div
                  key={w.id}
                  data-bookmark-item
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-static p-4"
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="font-display text-base font-bold text-slate-100">{w.word}</span>
                        <span className="text-xs text-slate-500 font-mono">{w.phonetic}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-slate-400 bg-white/[0.04]">
                          {w.part_of_speech}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 pr-2">{w.definition_cn}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={w.status} />
                        <span className="text-xs text-slate-600">难度 {w.difficulty}/5</span>
                      </div>
                    </button>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        ref={setStarRef(w.id)}
                        onClick={() => removeBookmark(w.id)}
                        className="p-1.5 text-pink-400 hover:text-pink-300 transition-colors" title="取消收藏"
                      >
                        <Star className="h-4 w-4 fill-pink-400" />
                      </button>
                      {expandedId === w.id ? (
                        <ChevronUp className="h-4 w-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-600" />
                      )}
                    </div>
                  </div>

                  <ExpandSection expanded={expandedId === w.id} w={w} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {total > 50 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span className="text-sm text-slate-500 font-mono">{page} / {Math.ceil(total / 50)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

// Extracted expand section with GSAP height animation
function ExpandSection({
  expanded,
  w,
}: {
  expanded: boolean
  w: BookmarkList['words'][number]
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const ctx = gsap.context(() => {
      if (expanded) {
        gsap.fromTo(el, {
          height: 0,
          opacity: 0,
        }, {
          height: 'auto',
          opacity: 1,
          duration: 0.3,
          ease: 'power3.out',
        })
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          duration: 0.25,
          ease: 'power3.in',
        })
      }
    })
    return () => ctx.revert()
  }, [expanded])

  if (!expanded) return null

  return (
    <div ref={contentRef} className="overflow-hidden">
      <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
        <p className="text-xs text-slate-500">英文释义</p>
        <p className="text-sm text-slate-300">{w.definition_en}</p>
        {w.example_sentences.length > 0 && (
          <>
            <p className="text-xs text-slate-500 mt-3">例句</p>
            {w.example_sentences.map((ex, i) => (
              <div key={i} className="text-sm space-y-0.5">
                <p className="text-slate-300">{ex.en}</p>
                <p className="text-slate-500 text-xs">{ex.cn}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new: { label: '未学', cls: 'bg-slate-500/10 text-slate-400' },
    learning: { label: '学习中', cls: 'bg-amber-500/10 text-amber-400' },
    reviewing: { label: '复习中', cls: 'bg-violet-500/10 text-violet-400' },
    mastered: { label: '已掌握', cls: 'bg-emerald-500/10 text-emerald-400' },
  }
  const m = map[status] ?? map.new
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.cls}`}>
      {m.label}
    </span>
  )
}
