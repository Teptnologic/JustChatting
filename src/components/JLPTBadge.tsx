const colors: Record<number, string> = {
  5: 'bg-n5/20 text-n5 border-n5/30',
  4: 'bg-n4/20 text-n4 border-n4/30',
  3: 'bg-n3/20 text-n3 border-n3/30',
  2: 'bg-n2/20 text-n2 border-n2/30',
  1: 'bg-n1/20 text-n1 border-n1/30',
}

export default function JLPTBadge({ level, size = 'sm' }: { level: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${colors[level] || ''} ${sizeClass}`}>
      N{level}
    </span>
  )
}
