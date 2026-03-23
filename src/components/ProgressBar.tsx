interface Props {
  value: number
  max: number
  color?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function ProgressBar({ value, max, color = 'bg-primary', showLabel = true, size = 'md' }: Props) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="w-full">
      <div className={`w-full bg-surface-lighter rounded-full ${h} overflow-hidden`}>
        <div
          className={`${h} ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-text-muted mt-1">{value}/{max} ({pct}%)</p>
      )}
    </div>
  )
}
