type ListCardProps = {
  title: string
  items: string[]
  footer?: string
}

export function ListCard({ title, items, footer }: ListCardProps) {
  return (
    <div className="mk-subpanel">
      <div className="mk-stack-sm">
        <h3 className="mk-subtitle">{title}</h3>
        <ul className="mk-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {footer ? <p className="mk-meta">{footer}</p> : null}
      </div>
    </div>
  )
}
