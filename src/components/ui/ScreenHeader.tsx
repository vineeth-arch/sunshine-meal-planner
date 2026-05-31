type ScreenHeaderProps = {
  eyebrow?: string
  title: string
  description: string
}

export function ScreenHeader({ eyebrow, title, description }: ScreenHeaderProps) {
  return (
    <header className="mk-stack-sm">
      {eyebrow ? <p className="mk-eyebrow">{eyebrow}</p> : null}
      <div className="mk-stack-xs">
        <h2 className="mk-section-title">{title}</h2>
        <p className="mk-copy">{description}</p>
      </div>
    </header>
  )
}
