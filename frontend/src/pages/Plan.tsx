import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { StudyPlan, PlanWeek } from '@/types'
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

function WeekCard({ week }: { week: PlanWeek }) {
  const [open, setOpen] = useState(week.week === 1)
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-mono font-bold">
            {week.week}
          </div>
          <div className="text-left">
            <div className="font-semibold text-stone-800">{week.focus}</div>
            <div className="text-xs text-stone-400">{week.weekly_goal}</div>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 py-4 grid grid-cols-2 gap-3">
          {week.daily_tasks.map((dt) => (
            <div key={dt.day} className="bg-stone-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-teal-600 mb-1.5">{dt.day}</div>
              <ul className="space-y-1">
                {dt.tasks.map((task, i) => (
                  <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                    <span className="text-teal-400 mt-0.5">·</span>{task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Plan() {
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ current_level: 'intermediate', target_score: 100, exam_date: '', weekly_hours: 10 })

  useEffect(() => {
    api.get<StudyPlan>('/plan/latest').then(p => { if (p.plan) setPlan(p as StudyPlan) }).catch(() => {})
  }, [])

  async function generate() {
    if (!form.exam_date) return
    setLoading(true)
    try {
      const result = await api.post<StudyPlan>('/plan/generate', form)
      setPlan(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">个性化备考计划</h1>
        <p className="text-stone-500 mt-1 text-sm">基于你的水平和目标，AI 为你定制专属学习路径</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-5">生成新计划</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">当前水平</label>
            <select
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-700 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.current_level}
              onChange={e => setForm({ ...form, current_level: e.target.value })}
            >
              <option value="beginner">初级 (Beginner)</option>
              <option value="intermediate">中级 (Intermediate)</option>
              <option value="advanced">高级 (Advanced)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">目标分数 (满分120)</label>
            <input
              type="number" min={60} max={120}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.target_score}
              onChange={e => setForm({ ...form, target_score: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">考试日期</label>
            <input
              type="date"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.exam_date}
              onChange={e => setForm({ ...form, exam_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">每周可用时间 (小时)</label>
            <input
              type="number" min={1} max={40}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.weekly_hours}
              onChange={e => setForm({ ...form, weekly_hours: Number(e.target.value) })}
            />
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading || !form.exam_date}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'AI 正在生成计划...' : '生成个性化计划'}
        </button>
      </div>

      {/* Plan display */}
      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-stone-800">
              你的学习计划 · {plan.plan?.total_weeks} 周
            </h2>
          </div>
          {plan.plan?.study_tips?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-700 mb-2">备考小贴士</div>
              <ul className="space-y-1">
                {plan.plan.study_tips.map((tip, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">✦</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-3">
            {plan.plan?.weeks?.map(week => <WeekCard key={week.week} week={week} />)}
          </div>
        </div>
      )}
    </div>
  )
}
