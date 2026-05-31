import type { PropsWithChildren } from 'react'

type PanelCardProps = PropsWithChildren<{
  className?: string
}>

export function PanelCard({ children, className }: PanelCardProps) {
  return <section className={`mk-panel${className ? ` ${className}` : ''}`}>{children}</section>
}
