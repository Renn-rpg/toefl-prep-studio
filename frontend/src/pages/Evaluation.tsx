import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { StageEval } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Plus } from 'lucide-react'

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
    <div className="max-w-3xl space-y-8 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-bold text-stone-800">阶段评估</h1>
        <p className="text-stone-500 mt-1 text-sm">记录周测 / 月测成绩，追踪进步轨迹</p>
      </div>

      {/* Log form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-stone-800 mb-5 flex items-center gap-2">
          <Plus className="h-5 w-5 text-teal-500" /> 录入成绩
        </h2>
        <form onSubmit={save} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">评估类型</label>
            <select className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.stage_type} onChange={e => setForm({ ...form, stage_type: e.target.value })}>
              <option value="weekly">周测</option>
              <option value="monthly">月测</option>
            </select>
          </div>
          {form.stage_type === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">第几周</label>
              <input type="number" min={1} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form.week_number} onChange={e => setForm({ ...form, week_number: Number(e.target.value) })} />
            </div>
          )}
          {(['listening', 'reading', 'speaking', 'writing'] as const).map(s => (
            <div key={s}>
              <label className="block text-xs font-medium text-stone-500 mb-1.5 capitalize">
                {s === 'listening' ? '听力' : s === 'reading' ? '阅读' : s === 'speaking' ? '口语' : '写作'} (0-30)
              </label>
              <input type="number" min={0} max={30}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={form[`${s}_score`]}
                onChange={e => setForm({ ...form, [`${s}_score`]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">备注</label>
            <input type="text" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="本次测试的感受..." />
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? '保存中...' : '保存成绩'}
            </button>
          </div>
        </form>
      </div>

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-stone-800 mb-4">成绩趋势</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis domain={[0, 120]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="总分" stroke="#0F766E" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="听力" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="阅读" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="口语" stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="写作" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        {history.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-stone-800 text-sm">
                {e.stage_type === 'weekly' ? `第 ${e.week_number} 周测试` : '月度测试'}
              </span>
              <span className="text-xs text-stone-400">{e.created_at.split('T')[0]}</span>
            </div>
            <div className="flex items-center gap-6">
              {(['listening', 'reading', 'speaking', 'writing'] as const).map(s => (
                <div key={s} className="text-center">
                  <div className="font-mono font-bold text-lg text-stone-800">
                    {e[`${s}_score` as keyof StageEval]}
                  </div>
                  <div className="text-[10px] text-stone-400">{s === 'listening' ? '听' : s === 'reading' ? '读' : s === 'speaking' ? '说' : '写'}</div>
                </div>
              ))}
              <div className="ml-auto text-center">
                <div className="font-mono font-bold text-2xl text-teal-600">{e.total_score}</div>
                <div className="text-[10px] text-stone-400">总分</div>
              </div>
            </div>
            {e.notes && <p className="mt-2 text-xs text-stone-400 italic">"{e.notes}"</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
