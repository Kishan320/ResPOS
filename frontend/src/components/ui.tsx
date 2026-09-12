import clsx from 'clsx'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function cn(...parts: Array<string | false | null | undefined>) {
  return clsx(parts)
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'soft' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
    xl: 'px-6 py-3.5 text-base',
  }
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-teal-600 text-white hover:bg-teal-500',
    soft: 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100',
    dark: 'bg-slate-900 text-white hover:bg-slate-800',
  }
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

export function Input({
  className,
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <label className="block w-full">
      {label && <span className="field-label">{label}</span>}
      <input className={cn('field-control', error && 'border-red-400', className)} {...props} />
      {hint && !error && <span className="mt-1 block text-xs font-medium text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}

export function Textarea({
  className,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block w-full">
      {label && <span className="field-label">{label}</span>}
      <textarea className={cn('field-control min-h-[96px] resize-y', className)} {...props} />
    </label>
  )
}

export function Select({
  className,
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block w-full">
      {label && <span className="field-label">{label}</span>}
      <select className={cn('field-control', className)} {...props}>
        {children}
      </select>
    </label>
  )
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  padding = true,
}: {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  padding?: boolean
}) {
  return (
    <div className={cn('premium-card overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            {title && <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padding && 'p-5 sm:p-6')}>{children}</div>
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    warning: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    danger: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    purple: 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', tones[tone])}>
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumb?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between mb-5 sm:mb-8 animate-fade-up">
      <div className="min-w-0">
        {breadcrumb && (
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400 font-bold mb-1.5 sm:mb-2">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="text-center py-14 px-4">
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          {icon}
        </div>
      )}
      <p className="font-bold text-slate-900 dark:text-white text-lg">{title}</p>
      {description && (
        <p className="text-sm mt-2 text-slate-500 max-w-md mx-auto leading-relaxed font-medium">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600', className)} />
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
  xwide,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
  xwide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-up max-h-[min(92dvh,92vh)] overflow-y-auto safe-pb',
          xwide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-snug">{title}</h3>
            {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 text-slate-900 dark:text-slate-100">{children}</div>
      </div>
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger'
}) {
  const tones = {
    default: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    brand: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-transparent shadow-lg shadow-emerald-700/20',
    success: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white border-transparent',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800',
  }
  const isBright = tone === 'brand' || tone === 'success'
  const muted = isBright ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
  const strong = isBright ? 'text-white' : 'text-slate-900 dark:text-white'
  return (
    <div className={cn('rounded-2xl border p-5 sm:p-6 animate-fade-up shadow-sm', tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('text-xs font-bold uppercase tracking-wider', muted)}>{label}</div>
        {icon && <div className={cn('opacity-90', strong)}>{icon}</div>}
      </div>
      <div className={cn('mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight', strong)}>{value}</div>
      {hint && <div className={cn('mt-2 text-xs font-medium', muted)}>{hint}</div>}
    </div>
  )
}

export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'danger' | 'success' | 'warning'
}) {
  const tones = {
    info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100',
    danger: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
  }
  return <div className={cn('rounded-xl border px-4 py-3 text-sm font-medium', tones[tone])}>{children}</div>
}
