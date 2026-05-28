import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { MEDIA } from '@/lib/media'
import type { StageEval } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Plus, BarChart3 } from 'lucide-react'
import { PageTransition } from '@/components/motion/PageTransition'
import { RevealSection } from '@/components/motion/RevealSection'

export function Evaluation() {
  const [history, setHistory] = useState<StageEval[]>([])
  const [form, setForm] = useState({
    stage_type: 'weekly', week_number: 1,
    reading_score: 0, listening_score: 0, speaking_score: 0, writing_score: 0, notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get<StageEval[]>('/evaluation/history').then(setHistory) }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const r = await api.post<StageEval>('/evaluation/stage', {
        ...form, week_number: form.stage_type === 'weekly' ? form.week_number : undefined
      })
      setHistory([r, ...history])
    } finally { setSaving(false) }
  }

  const trendData = [...history].reverse().map(e => ({
    name: e.stage_type === 'weekly' ? `W${e.week_number}` : e.created_at.split('T')[0],
    总分: e.total_score, 听力: e.listening_score, 阅读: e.reading_score,
    口语: e.speaking_score, 写作: e.writing_score,
  }))

  return (
    <PageTransition>
      <div className="max-w-full lg:max-w-3xl space-y-8">
        {/* Header with image */}
        <div className="hero-image-overlay rounded-2xl -mx-2 overflow-hidden">
          <img src={MEDIA.evaluation.header} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="relative z-[2] p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-[1.75rem] font-bold text-slate-100 tracking-tight">阶段评估</h1>
                <p className="text-slate-400 text-sm">记录周测 / 月测成绩，追踪进步轨迹</p>
              </div>
            </div>
          </div>
        </div>

        {/* Log form */}
        <div className="glass-card-static p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100 mb-5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-teal-400" />
            </div>
            录入成绩
          </h2>
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">评估类型</label>
              <select className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.stage_type} onChange={e => setForm({ ...form, stage_type: e.target.value })}>
                <option value="weekly">周测</option>
                <option value="monthly">月测</option>
              </select>
            </div>
            {form.stage_type === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">第几周</label>
                <input type="number" min={1} className="w-full input-dark px-3 py-2.5 text-sm"
                  value={form.week_number} onChange={e => setForm({ ...form, week_number: Number(e.target.value) })} />
              </div>
            )}
            {(['listening', 'reading', 'speaking', 'writing'] as const).map(s => (
              <div key={s}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 capitalize">
                  {s === 'listening' ? '听力' : s === 'reading' ? '阅读' : s === 'speaking' ? '口语' : '写作'} (0-30)
                </label>
                <input type="number" min={0} max={30}
                  className="w-full input-dark px-3 py-2.5 text-sm"
                  value={form[`${s}_score`]}
                  onChange={e => setForm({ ...form, [`${s}_score`]: Number(e.target.value) })} />
              </div>
            ))}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">备注</label>
              <input type="text" className="w-full input-dark px-3 py-2.5 text-sm"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="本次测试的感受..." />
            </div>
            <div className="col-span-1 md:col-span-2">
              <button type="submit" disabled={saving}
                className="btn-gradient px-6 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? '保存中...' : '保存成绩'}
              </button>
            </div>
          </form>
        </div>

        {/* Trend chart */}
        {trendData.length > 0 && (
          <RevealSection><div className="card-glow p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-teal-500 to-teal-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">成绩趋势</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">总分与各科分数变化</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" strokeWidth={0.8} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12, borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: '#1C1C27',
                    color: '#E2E8F0',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                  }}
                />
                <Line type="monotone" dataKey="总分" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 4, fill: '#818CF8' }} />
                <Line type="monotone" dataKey="听力" stroke="#06B6D4" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="阅读" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="口语" stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                <Line type="monotone" dataKey="写作" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div></RevealSection>
        )}

        {/* History list */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-teal-500 to-teal-300" />
              <h2 className="font-display text-lg font-semibold text-slate-100">评测历史</h2>
            </div>
            {history.map(e => (
              <div key={e.id} className="glass-card-static p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-100 text-sm">
                    {e.stage_type === 'weekly' ? `第 ${e.week_number} 周测试` : '月度测试'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{e.created_at.split('T')[0]}</span>
                </div>
                <div className="flex items-center gap-6">
                  {(['listening', 'reading', 'speaking', 'writing'] as const).map(s => (
                    <div key={s} className="text-center">
                      <div className="font-mono font-bold text-lg text-slate-200">
                        {e[`${s}_score` as keyof StageEval]}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {s === 'listening' ? '听' : s === 'reading' ? '读' : s === 'speaking' ? '说' : '写'}
                      </div>
                    </div>
                  ))}
                  <div className="ml-auto text-center">
                    <div className="font-mono font-bold text-2xl text-brand-400">{e.total_score}</div>
                    <div className="text-[10px] text-slate-500 font-medium">总分</div>
                  </div>
                </div>
                {e.notes && <p className="mt-2 text-xs text-slate-500 italic">"{e.notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
