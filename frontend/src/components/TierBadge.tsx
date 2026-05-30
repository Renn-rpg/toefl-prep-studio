import type { FrequencyTier } from '@/types'

export function getTier(frequencyRank?: number): FrequencyTier {
  if (!frequencyRank || frequencyRank <= 0) return 'low'
  if (frequencyRank >= 50) return 'high'
  if (frequencyRank >= 10) return 'medium'
  return 'low'
}

const tierConfig: Record<FrequencyTier, { label: string; cls: string }> = {
  high:   { label: '高', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  medium: { label: '中', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  low:    { label: '低', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

export function TierBadge({ frequencyRank, tags, className = '' }: {
  frequencyRank?: number
  tags?: string[]
  className?: string
}) {
  const tier = getTier(frequencyRank)
  const tagLabel = tags?.[0] || null
  const { label, cls } = tierConfig[tier]

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border inline-flex items-center gap-1 ${cls} ${className}`}
      title={tagLabel || undefined}>
      {label}
      {tagLabel && <span className="opacity-60 hidden sm:inline">· {tagLabel}</span>}
    </span>
  )
}
