type StatCardProps = {
  label: string
  value: string
  tone?: 'default' | 'accent'
}

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className={`mk-stat-card${tone === 'accent' ? ' mk-stat-card-accent' : ''}`}>
      <span className="mk-stat-label">{label}</span>
      <strong className="mk-stat-value">{value}</strong>
    </div>
  )
}
