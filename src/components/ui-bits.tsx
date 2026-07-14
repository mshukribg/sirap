'use client'

import { STATUS_LABEL } from '@/lib/api-client'

export function StatusBadge({ status }: { status: string }) {
  const cls = `status-${status}`
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function GlassCard({ children, className = '', strong = false }: { children: React.ReactNode; className?: string; strong?: boolean }) {
  return (
    <div className={`${strong ? 'glass-card-strong' : 'glass-card'} ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="text-sm text-foreground/60 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-foreground/40" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-foreground/60 mt-1 max-w-md">{description}</p>}
    </div>
  )
}

export function LoadingState({ label = 'Memuatkan…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3 text-sm text-foreground/60">
      <div className="w-4 h-4 border-2 border-[#12A3A8] border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  )
}

export function StatCard({ label, value, hint, icon: Icon, color = '#12A3A8' }: {
  label: string
  value: string | number
  hint?: string
  icon: any
  color?: string
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-foreground/60 font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-foreground/60 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}
