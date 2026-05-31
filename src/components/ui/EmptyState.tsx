type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="mk-empty-state">
      <h3 className="mk-subtitle">{title}</h3>
      <p className="mk-copy">{description}</p>
    </div>
  )
}
