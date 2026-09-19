import { Link } from 'react-router-dom'
import { cn } from '@/components/ui'

type Props = {
  variant?: 'full' | 'mark'
  className?: string
  imgClassName?: string
  to?: string | null
  showWordmark?: boolean
  collapsed?: boolean
  /** Height in px for full logo (default 32) */
  height?: number
  /** Max width in px for full logo (default 140) */
  maxWidth?: number
  /**
   * dark = logo on dark UI (sidebar, dark hero, footer)
   * light = logo on light UI (landing header, login form)
   */
  surface?: 'light' | 'dark'
}

/**
 * Official DineFlow logo - sized for headers.
 * Uses transparent-bg PNG so it stays visible on light and dark surfaces.
 */
export default function BrandLogo({
  variant = 'full',
  className,
  imgClassName,
  to = '/',
  showWordmark = false,
  collapsed = false,
  height = 32,
  maxWidth = 140,
  surface = 'light',
}: Props) {
  const isMark = collapsed || variant === 'mark'
  const src = isMark ? '/dineflow-icon-192.png' : '/dineflow-logo.png'
  const h = isMark ? 36 : height
  const w = isMark ? 36 : maxWidth

  const img = (
    <img
      src={src}
      alt="DineFlow"
      width={w}
      height={h}
      decoding="async"
      className={cn(
        'brand-logo-img block shrink-0 object-contain object-left',
        isMark && 'brand-logo-mark',
        surface === 'dark' && !isMark && 'brand-logo-on-dark',
        imgClassName
      )}
      style={
        isMark
          ? { width: h, height: h, maxWidth: h, maxHeight: h }
          : { height: h, width: 'auto', maxWidth: w, maxHeight: h }
      }
    />
  )

  const body = (
    <span
      className={cn(
        'inline-flex items-center gap-2 min-w-0 max-w-full',
        surface === 'dark' && !isMark && 'rounded-md bg-white/95 px-2 py-1',
        isMark && surface === 'dark' && 'rounded-lg bg-white p-1',
        className
      )}
    >
      {img}
      {showWordmark && !isMark && (
        <span className="font-bold tracking-tight text-inherit truncate text-sm">DineFlow</span>
      )}
    </span>
  )

  if (to === null) return body
  return (
    <Link
      to={to}
      className="inline-flex items-center shrink-0 max-w-[min(100%,180px)]"
      aria-label="DineFlow home"
    >
      {body}
    </Link>
  )
}
