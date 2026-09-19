import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { mediaUrl } from '@/lib/media'
import { Button, Input, Textarea } from '@/components/ui'
import BrandLogo from '@/components/BrandLogo'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Calculator,
  TrendingUp,
  Menu,
  X,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageSquare,
} from 'lucide-react'

type CmsSection = {
  section_key: string
  title?: string
  subtitle?: string
  body?: string
  cta_label?: string
  cta_url?: string
  image_url?: string
  image_url_2?: string
  image_url_3?: string
  image_url_4?: string
  badge_text?: string
  extra_json?: Record<string, unknown> | null
  sort_order?: number
}

type Item = {
  title?: string
  t?: string
  name?: string
  desc?: string
  d?: string
  quote?: string
  a?: string
  q?: string
  label?: string
  value?: string
  image?: string
  img?: string
  cta?: string
  time?: string
  n?: string | number
  role?: string
}

type ContactField = {
  key: string
  label?: string
  type?: string
  required?: boolean
  enabled?: boolean
  placeholder?: string
}

type ContactConfig = {
  title?: string
  subtitle?: string
  body?: string
  badge_text?: string
  cta_label?: string
  submit_label?: string
  success_message?: string
  show_on_landing?: boolean
  fields?: ContactField[]
  is_active?: boolean
}

function Reveal({
  children,
  from = 'up',
  className = '',
  delay = 0,
}: {
  children: ReactNode
  from?: 'left' | 'right' | 'up' | 'down' | 'scale'
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`reveal from-${from} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function img(url?: string | null, fb = '/landing/pos.jpg') {
  return mediaUrl(url) || fb
}
function items(sec?: CmsSection | null, key = 'items'): Item[] {
  const ex = sec?.extra_json
  if (!ex) return []
  const arr = (ex as Record<string, unknown>)[key]
  return Array.isArray(arr) ? (arr as Item[]) : []
}
function tOf(i: Item) {
  return i.title || i.t || i.name || i.q || ''
}
function dOf(i: Item) {
  return i.desc || i.d || i.quote || i.a || i.label || ''
}

function HdImage({
  src,
  alt,
  className = '',
  zoom = false,
  kenburns = false,
}: {
  src: string
  alt: string
  className?: string
  zoom?: boolean
  kenburns?: boolean
}) {
  const shell = zoom || kenburns
  const imgEl = (
    <img
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      loading="lazy"
      decoding="async"
      className={cn(
        'object-cover',
        shell ? 'h-full w-full' : className,
        !shell && !className.includes('w-') && 'w-full'
      )}
    />
  )
  if (!shell) return imgEl
  return (
    <div className={cn(zoom && 'img-zoom', kenburns && 'img-kenburns', className)}>
      {imgEl}
    </div>
  )
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

const MENU_ITEMS = [
  { name: 'Tandoori Murgh Tikka', tag: 'Charcoal Tandoor', price: '₹365', img: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80' },
  { name: 'Special Ghee Masala Dosa', tag: 'South Indian Tiffin', price: '₹125', img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80' },
  { name: 'Woodfired Margherita Classica', tag: 'Artisan Bistro', price: '₹395', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80' },
  { name: 'Awadhi Mutton Dum Biryani', tag: 'Chef Signature', price: '₹495', img: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80' },
  { name: 'Overnight Dal Makhani', tag: 'Clay Pot Dum', price: '₹295', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Truffled Mushroom Risotto', tag: 'Handmade Pasta', price: '₹445', img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80' },
  { name: 'Kumbakonam Degree Coffee', tag: 'Brass Tumbler', price: '₹45', img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80' },
  { name: 'Traditional Tiramisu', tag: 'Bakehouse Dolce', price: '₹275', img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80' },
]

function MenuRail({
  title,
  subtitle,
  items: railItems = MENU_ITEMS,
  large = false,
  dark = false,
  sectionId,
}: {
  title: string
  subtitle?: string
  items?: typeof MENU_ITEMS
  large?: boolean
  dark?: boolean
  sectionId?: string
}) {
  const railRef = useRef<HTMLDivElement>(null)
  function scrollByDir(dir: -1 | 1) {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * (large ? 320 : 240), behavior: 'smooth' })
  }
  return (
    <div id={sectionId} className={cn(dark ? 'bg-slate-950 text-white' : 'bg-white', 'py-12 sm:py-16', sectionId && 'scroll-mt-20')}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className={cn('text-xs font-bold uppercase tracking-[0.16em] mb-2', dark ? 'text-emerald-400' : 'text-emerald-700')}>
              Menu style preview
            </p>
            <h2 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', dark ? 'text-white' : 'text-slate-950')}>
              {title}
            </h2>
            {subtitle && (
              <p className={cn('text-sm font-medium mt-2 max-w-xl', dark ? 'text-slate-400' : 'text-slate-500')}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className={cn(
                'h-10 w-10 rounded-full border font-bold text-lg leading-none',
                dark ? 'border-white/15 text-white hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              )}
              aria-label="Scroll left"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className={cn(
                'h-10 w-10 rounded-full border font-bold text-lg leading-none',
                dark ? 'border-white/15 text-white hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              )}
              aria-label="Scroll right"
            >
              ›
            </button>
          </div>
        </div>
        <div className={cn('menu-fade-edge', dark && 'on-dark')}>
          <div ref={railRef} className="menu-rail">
            {railItems.map((m) => (
              <article key={m.name} className={cn('menu-card', large && 'menu-card-lg', dark && '!bg-white/[0.06] !border-white/10')}>
                <div className="menu-card-img">
                  <img src={m.img} alt={m.name} loading="lazy" />
                  <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-sm">
                    {m.tag}
                  </span>
                </div>
                <div className={cn('menu-card-body', dark && 'text-white')}>
                  <div className={cn('font-bold text-sm leading-snug', dark ? 'text-white' : 'text-slate-900')}>{m.name}</div>
                  <div className={cn('text-xs font-semibold mt-1', dark ? 'text-emerald-300' : 'text-emerald-700')}>{m.price}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function VatCalculator() {
  const [amount, setAmount] = useState('100')
  const [rate, setRate] = useState('5')
  const [mode, setMode] = useState<'exclusive' | 'inclusive'>('exclusive')
  const a = Math.max(0, Number(amount) || 0)
  const r = Math.max(0, Number(rate) || 0)
  const tax = mode === 'exclusive' ? (a * r) / 100 : a - a / (1 + r / 100)
  const base = mode === 'exclusive' ? a : a - tax
  const total = mode === 'exclusive' ? a + tax : a
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-3">
        <Calculator size={18} className="text-emerald-600" /> Tax / VAT calculator
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-500">
          Amount (AED)
          <input className="field-control mt-1" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Rate %
          <input className="field-control mt-1" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2 mt-3">
        {(['exclusive', 'inclusive'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border ${
              mode === m ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600'
            }`}
          >
            {m === 'exclusive' ? 'Tax exclusive' : 'Tax inclusive'}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] font-bold uppercase text-slate-400">Base</div>
          <div className="font-black text-slate-900">{base.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="text-[10px] font-bold uppercase text-emerald-700">Tax</div>
          <div className="font-black text-emerald-800">{tax.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-white">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
          <div className="font-black">{total.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}

function RoiCalculator() {
  const [bills, setBills] = useState('120')
  const [avg, setAvg] = useState('45')
  const [margin, setMargin] = useState('18')
  const b = Math.max(0, Number(bills) || 0)
  const a = Math.max(0, Number(avg) || 0)
  const m = Math.max(0, Number(margin) || 0)
  const revenue = b * a
  const profit = (revenue * m) / 100
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-900 mb-3">
        <TrendingUp size={18} className="text-emerald-600" /> Daily sales planner
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-slate-500">
          Bills / day
          <input className="field-control mt-1" type="number" value={bills} onChange={(e) => setBills(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Avg bill
          <input className="field-control mt-1" type="number" value={avg} onChange={(e) => setAvg(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Margin %
          <input className="field-control mt-1" type="number" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 space-y-2 text-sm font-semibold">
        <div className="flex justify-between">
          <span className="text-slate-500">Daily revenue</span>
          <span>AED {revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Daily profit est.</span>
          <span className="text-emerald-700">AED {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">30-day revenue est.</span>
          <span>AED {(revenue * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  )
}

function ModuleDeep({ sec, reverse }: { sec: CmsSection; reverse?: boolean }) {
  const bullets = (sec.extra_json?.bullets as string[]) || []
  const growth = (sec.extra_json?.growth as string) || ''
  const orgReports = (sec.extra_json?.org_reports as Item[]) || []
  const platformReports = (sec.extra_json?.platform_reports as Item[]) || []
  const isReports = sec.section_key === 'mod_reports' || sec.section_key === 'reports'

  return (
    <section id={sec.section_key} className="py-16 sm:py-20 border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <Reveal from={reverse ? 'right' : 'left'}>
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/80">
              <HdImage
                src={img(sec.image_url)}
                alt={sec.title || ''}
                zoom
                className="h-[280px] sm:h-[360px] w-full"
              />
              {sec.image_url_2 && (
                <div className="absolute bottom-4 right-4 w-2/5 rounded-2xl overflow-hidden border-4 border-white shadow-lg landing-float">
                  <HdImage src={img(sec.image_url_2)} alt="" className="h-28 sm:h-36 w-full" zoom />
                </div>
              )}
            </div>
          </Reveal>
          <Reveal from={reverse ? 'left' : 'right'} delay={80}>
            {sec.badge_text && (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{sec.badge_text}</p>
            )}
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">{sec.title}</h2>
            {sec.subtitle && <p className="text-lg font-semibold text-slate-600 mt-3 leading-relaxed">{sec.subtitle}</p>}
            {sec.body && <p className="text-slate-500 font-medium mt-4 leading-relaxed">{sec.body}</p>}
            {!!bullets.length && (
              <ul className="mt-5 space-y-2.5">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-sm font-semibold text-slate-700">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {growth && (
              <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900 leading-relaxed">
                Business impact: {growth}
              </div>
            )}
            <div className="mt-6">
              <Link to={sec.cta_url || '/login'}>
                <Button>
                  {sec.cta_label || 'Try this module'} <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>

        {isReports && (orgReports.length > 0 || platformReports.length > 0) && (
          <div className="mt-12 space-y-8">
            {orgReports.length > 0 && (
              <Reveal from="up">
                <h3 className="text-xl font-extrabold text-slate-950 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" size={22} />
                  Organization reports ({orgReports.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orgReports.map((r, i) => (
                    <div
                      key={tOf(r) + i}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-2">
                        <FileText size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{tOf(r)}</div>
                          <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{dOf(r)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
            {platformReports.length > 0 && (
              <Reveal from="up" delay={60}>
                <h3 className="text-xl font-extrabold text-slate-950 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="text-violet-600" size={22} />
                  Platform reports ({platformReports.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {platformReports.map((r, i) => (
                    <div
                      key={tOf(r) + i}
                      className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 shadow-sm"
                    >
                      <div className="font-bold text-slate-900 text-sm">{tOf(r)}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{dOf(r)}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
            <p className="text-sm font-medium text-slate-500">
              Each report exports as PDF and Excel from Report Hub. Empty periods still produce a downloadable file.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function LandingPage() {
  const token = useAuthStore((s) => s.token)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [mobileNav, setMobileNav] = useState(false)

  const cms = useQuery({
    queryKey: ['cms-public'],
    queryFn: async () => (await api.get('/cms/public/bundle')).data,
    staleTime: 20_000,
  })

  const allSections: CmsSection[] = cms.data?.sections || []
  const byKey = (k: string) => allSections.find((s) => s.section_key === k)
  const moduleSections = useMemo(
    () =>
      allSections
        .filter((s) => s.section_key.startsWith('mod_'))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [allSections]
  )

  const hero = byKey('hero')
  const stats = byKey('stats')
  const about = byKey('about')
  const moduleMap = byKey('module_map')
  const features = byKey('features')
  const industries = byKey('industries')
  const gallery = byKey('gallery')
  const journey = byKey('journey')
  const why = byKey('why_us')
  const steps = byKey('how_it_works')
  const testimonials = byKey('testimonials')
  const faqs = byKey('faqs')
  const careersBanner = byKey('careers_banner')
  const cta = byKey('cta')
  const footer = byKey('footer')
  const careers = cms.data?.careers || []
  const social = cms.data?.social || []

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  const contactCfg = (cms.data as { contact?: ContactConfig } | undefined)?.contact
  const [contactOpen, setContactOpen] = useState(false)
  const [contactValues, setContactValues] = useState<Record<string, string>>({})
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [contactDone, setContactDone] = useState('')
  const [contactFail, setContactFail] = useState('')

  const contactFields = useMemo(() => {
    const fields = contactCfg?.fields || []
    return fields.filter((f) => f && f.enabled !== false && f.key)
  }, [contactCfg])

  const submitContact = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { fields: { ...contactValues } }
      for (const k of ['name', 'email', 'phone', 'message'] as const) {
        if (contactValues[k] !== undefined) body[k] = contactValues[k]
      }
      return (await api.post('/cms/public/contact', body)).data as { message?: string }
    },
    onSuccess: (data) => {
      setContactDone(data?.message || contactCfg?.success_message || 'Thank you. Message received.')
      setContactFail('')
      setContactErrors({})
      setContactValues({})
    },
    onError: (e: unknown) => {
      setContactDone('')
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (detail && typeof detail === 'object' && detail !== null && 'fields' in (detail as object)) {
        setContactErrors((detail as { fields: Record<string, string> }).fields || {})
        setContactFail('Please fix the highlighted fields.')
      } else {
        setContactFail(errMsg(e))
      }
    },
  })

  const nav = [
    { href: '#modules', label: 'Features' },
    { href: '#industries', label: 'Industries' },
    { href: '#menu-preview', label: 'Menu' },
    { href: '#faq', label: 'FAQ' },
    { href: '#tools', label: 'Tools' },
    { href: '#careers', label: 'Careers' },
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <div className="landing-root min-h-full overflow-x-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo to="/" imgClassName="h-8 sm:h-9 w-auto max-w-[150px]" />
            <div className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {footer?.badge_text || 'For organizations'}
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-emerald-700">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {token ? (
              <Link to="/app">
                <Button>Open app</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/login">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
            <button className="lg:hidden p-2 rounded-xl border border-slate-200" onClick={() => setMobileNav((v) => !v)}>
              {mobileNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMobileNav(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {n.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <HdImage
            src={img(hero?.image_url, '/landing/hero.jpg')}
            alt=""
            kenburns
            className="h-full min-h-[88vh] w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/92 to-slate-950/45" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full grid lg:grid-cols-2 gap-10 items-center">
          <Reveal from="left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold text-emerald-200 mb-5">
              {hero?.badge_text || 'Restaurant and retail POS'}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold text-white tracking-tight leading-[1.08]">
              {hero?.title || 'Restaurant and retail POS that runs the full store'}
            </h1>
            <p className="mt-5 text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
              {hero?.subtitle}
            </p>
            {hero?.body && <p className="mt-3 text-sm text-slate-400 font-medium max-w-xl leading-relaxed">{hero.body}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={hero?.cta_url || '/login'}>
                <Button size="xl" className="shadow-xl shadow-emerald-900/40">
                  {hero?.cta_label || 'Start free trial'} <ArrowRight size={18} />
                </Button>
              </Link>
              <a href="#modules">
                <Button size="xl" variant="secondary" className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/15">
                  See all modules
                </Button>
              </a>
            </div>
          </Reveal>
          <Reveal from="right" delay={100}>
            <div className="hidden sm:block relative">
              <div className="landing-float rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                <HdImage
                  src={img(hero?.image_url_2, '/landing/pos.jpg')}
                  alt="POS Terminal"
                  zoom
                  className="h-[340px] w-full"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items(stats).map((s, i) => (
            <Reveal key={i} from="up" delay={i * 60}>
              <div className="rounded-2xl bg-white border border-slate-200 p-5 text-center shadow-sm">
                <div className="text-3xl font-black landing-gradient-text">{s.value || tOf(s)}</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">{s.label || dOf(s)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal from="left">
            <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200">
              <HdImage src={img(about?.image_url, '/landing/fine-dine.jpg')} alt="" className="h-[360px]" />
            </div>
          </Reveal>
          <Reveal from="right">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{about?.badge_text}</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">{about?.title}</h2>
            <p className="text-slate-600 font-semibold mt-4 leading-relaxed">{about?.subtitle}</p>
            <p className="text-slate-500 font-medium mt-3 leading-relaxed">{about?.body}</p>
          </Reveal>
        </div>
      </section>

      {/* FEATURES HIGHLIGHTS */}
      <section className="bg-[#f6f8fa] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{features?.badge_text}</p>
            <h2 className="text-3xl font-extrabold text-slate-950">{features?.title}</h2>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl">{features?.subtitle}</p>
          </Reveal>
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items(features).map((f, i) => (
              <Reveal key={i} from="up" delay={(i % 3) * 70}>
                <article className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm h-full flex flex-col">
                  <HdImage src={img(f.img || f.image)} alt={tOf(f)} zoom className="h-44 w-full" />
                  <div className="p-5 flex-1">
                    <h3 className="font-bold text-lg leading-snug text-slate-950">{tOf(f)}</h3>
                    <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{dOf(f)}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <MenuRail
        sectionId="menu-preview"
        title="Restaurant menu browsing on POS"
        subtitle="Swipe categories and dishes like food apps - then complete the bill with DineFlow multi-pay checkout."
      />

      {/* MODULE MAP */}
      <section id="modules" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Reveal from="up">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{moduleMap?.badge_text}</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">{moduleMap?.title}</h2>
          <p className="text-slate-500 font-medium mt-3 max-w-2xl">{moduleMap?.subtitle}</p>
        </Reveal>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(moduleSections.length
            ? moduleSections.map((m) => ({
                t: m.title || m.section_key,
                d: m.subtitle || m.badge_text || '',
                href: `#${m.section_key}`,
              }))
            : items(moduleMap).map((m) => ({ t: tOf(m), d: dOf(m), href: '#modules' }))
          ).map((m, i) => (
            <Reveal key={i} from="scale" delay={(i % 4) * 40}>
              <a
                href={m.href}
                className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-400 hover:shadow-md transition"
              >
                <div className="font-bold text-slate-900 text-sm">{m.t}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">{m.d}</div>
              </a>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-slate-400">
          Scroll for a full description of each module with examples and Full HD photography.
        </p>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="bg-slate-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400 mb-2">{industries?.badge_text}</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold max-w-3xl">{industries?.title}</h2>
            <p className="text-slate-400 font-medium mt-3 max-w-2xl">{industries?.subtitle}</p>
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items(industries).map((v, i) => (
              <Reveal key={i} from={i % 2 ? 'right' : 'left'} delay={(i % 3) * 70}>
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] h-full">
                  <div className="relative h-48">
                    <HdImage src={img(v.img || v.image)} alt={tOf(v)} zoom className="h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent pointer-events-none" />
                    <h3 className="absolute bottom-3 left-4 right-4 font-bold text-lg leading-snug">{tOf(v)}</h3>
                  </div>
                  <p className="p-4 text-sm font-medium text-slate-300 leading-relaxed">{dOf(v)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-6">{gallery?.title || 'In stores and kitchens'}</h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[gallery?.image_url, gallery?.image_url_2, gallery?.image_url_3, gallery?.image_url_4].map((src, i) => (
              <Reveal key={i} from="scale" delay={i * 60}>
                <div className="rounded-2xl overflow-hidden shadow-md border border-slate-100">
                  <HdImage src={img(src)} alt="" zoom className="h-40 sm:h-52 w-full" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ALL MODULE DEEP DIVES */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-4">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">Deep product tour</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
              Every module - what it does and how it helps the business
            </h2>
            <p className="text-slate-500 font-medium mt-3 max-w-3xl">
              These are the same modules available after sign-in. Content and images are editable from Super Admin CMS.
            </p>
          </Reveal>
        </div>
        {moduleSections.map((sec, i) => (
          <ModuleDeep key={sec.section_key} sec={sec} reverse={i % 2 === 1} />
        ))}
      </div>

      {/* JOURNEY */}
      <section className="bg-[#f6f8fa] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{journey?.badge_text}</p>
            <h2 className="text-3xl font-extrabold text-slate-950">{journey?.title}</h2>
            <p className="text-slate-500 font-medium mt-2">{journey?.subtitle}</p>
          </Reveal>
          <div className="mt-10 space-y-8">
            {(items(journey, 'steps').length ? items(journey, 'steps') : items(journey)).map((step, i) => (
              <Reveal key={i} from={i % 2 ? 'right' : 'left'}>
                <div className={`grid lg:grid-cols-2 gap-6 items-center ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                  <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200">
                    <HdImage src={img(step.img || step.image)} alt={tOf(step)} zoom className="h-64 w-full" />
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">{step.time || `Step ${i + 1}`}</div>
                    <h3 className="text-2xl font-extrabold mt-2">{tOf(step)}</h3>
                    <p className="text-slate-500 font-medium mt-3 leading-relaxed">{dOf(step)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY + STEPS - clean two columns, fixed image/text alignment */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="min-w-0">
            <Reveal from="left">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">
                {why?.badge_text || 'Why DineFlow'}
              </p>
              <h2 className="text-3xl font-extrabold text-slate-950 mb-6 leading-tight">
                {why?.title || 'Why organizations choose DineFlow'}
              </h2>
            </Reveal>
            <div className="space-y-3">
              {items(why).map((w, i) => (
                <Reveal key={i} from="left" delay={i * 60}>
                  <article className="why-card">
                    <div className="why-card-img">
                      <img src={img(w.img || w.image)} alt={tOf(w)} loading="lazy" />
                    </div>
                    <div className="why-card-text">
                      <h3>{tOf(w)}</h3>
                      <p>{dOf(w)}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <Reveal from="right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">
                {steps?.badge_text || 'For new organizations'}
              </p>
              <h2 className="text-3xl font-extrabold text-slate-950 mb-6 leading-tight">
                {steps?.title || 'From onboarding to first sale'}
              </h2>
            </Reveal>
            <div className="space-y-3">
              {(items(steps, 'steps').length ? items(steps, 'steps') : items(steps)).map((s, i) => (
                <Reveal key={i} from="right" delay={i * 60}>
                  <article className="step-card">
                    <div className="step-num">{s.n || i + 1}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-white leading-snug">{tOf(s)}</div>
                      <div className="text-sm text-slate-400 font-medium mt-1.5 leading-relaxed">{dOf(s)}</div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Food / menu style horizontal rail (Swiggy-Zomato style) */}
      <MenuRail
        title="Sell like a modern food menu"
        subtitle="Horizontal menu rails for restaurants and QSR - browse categories the way guests know from food apps, then bill on DineFlow."
        large
      />

      {/* TESTIMONIALS */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{testimonials?.badge_text}</p>
            <h2 className="text-3xl font-extrabold text-slate-950">{testimonials?.title}</h2>
          </Reveal>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {items(testimonials).map((t, i) => (
              <Reveal key={i} from="up" delay={i * 70}>
                <article className="h-full rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                  <HdImage src={img(t.img || t.image)} alt="" className="h-14 w-14 rounded-full object-cover mb-4" />
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">"{dOf(t)}"</p>
                  <div className="mt-5 font-bold text-slate-950">{t.name || tOf(t)}</div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1">{t.role || ''}</div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Reveal from="up">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">{faqs?.badge_text}</p>
          <h2 className="text-3xl font-extrabold text-slate-950">{faqs?.title}</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {items(faqs).map((f, i) => {
            const open = openFaq === i
            return (
              <Reveal key={i} from="up" delay={Math.min(i * 30, 180)}>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button type="button" className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setOpenFaq(open ? null : i)}>
                    <span className="font-bold text-slate-900">{f.q || tOf(f)}</span>
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-sm font-medium text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                      {f.a || dOf(f)}
                    </div>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* CAREERS */}
      <section id="careers" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal from="up">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">Careers</p>
            <h2 className="text-3xl font-extrabold text-slate-950">{careersBanner?.title}</h2>
            <p className="text-slate-500 font-medium mt-2">{careersBanner?.subtitle}</p>
          </Reveal>
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {careers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500">
                Open roles appear when published in CMS.
              </div>
            ) : (
              careers.map((c: { id: number; title: string; department?: string; location?: string; description?: string; image_url?: string; apply_email?: string }) => (
                <Reveal key={c.id} from="up">
                  <article className="flex gap-4 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <HdImage src={mediaUrl(c.image_url) || '/landing/team.jpg'} alt="" className="w-28 sm:w-36 object-cover" />
                    <div className="p-4 flex-1">
                      <h3 className="font-bold text-slate-950">{c.title}</h3>
                      <p className="text-xs font-bold text-emerald-700 mt-1">{[c.department, c.location].filter(Boolean).join(' · ')}</p>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2 font-medium">{c.description}</p>
                      {c.apply_email && (
                        <a href={`mailto:${c.apply_email}`} className="text-sm font-bold text-emerald-700 mt-2 inline-block">
                          Apply
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Reveal from="up">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2">Free tools</p>
          <h2 className="text-3xl font-extrabold text-slate-950">Tax calculator and sales planner</h2>
          <p className="text-slate-500 font-medium mt-2 max-w-2xl">
            Estimate tax on a bill and project daily sales - practical tools for store owners.
          </p>
        </Reveal>
        <div className="mt-8 grid lg:grid-cols-2 gap-5">
          <Reveal from="left">
            <VatCalculator />
          </Reveal>
          <Reveal from="right">
            <RoiCalculator />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <Reveal from="scale">
          <div className="rounded-3xl overflow-hidden relative min-h-[240px] flex items-center">
            <HdImage src={img(cta?.image_url, '/landing/checkout.jpg')} alt="" className="absolute inset-0 h-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-emerald-950/50" />
            <div className="relative px-8 py-12 sm:px-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 text-white w-full">
              <div>
                <div className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">{cta?.badge_text}</div>
                <h2 className="text-3xl font-extrabold">{cta?.title}</h2>
                <p className="text-slate-300 font-medium mt-2">{cta?.subtitle}</p>
              </div>
              <Link to={cta?.cta_url || '/login'}>
                <Button size="xl">
                  {cta?.cta_label || 'Sign in'} <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CONTACT - top of footer area, same-page form */}
      {contactCfg?.show_on_landing !== false && contactCfg?.is_active !== false && (
        <section id="contact" className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal from="up">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 mb-2 flex items-center gap-2">
                    <Mail size={14} /> {contactCfg?.badge_text || 'Contact'}
                  </p>
                  <h2 className="text-3xl font-extrabold text-slate-950">{contactCfg?.title || 'Contact us'}</h2>
                  <p className="text-slate-500 font-medium mt-2">{contactCfg?.subtitle}</p>
                  {contactCfg?.body && (
                    <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">{contactCfg.body}</p>
                  )}
                </div>
                <Button
                  size="lg"
                  variant={contactOpen ? 'secondary' : 'primary'}
                  onClick={() => {
                    setContactOpen((v) => !v)
                    setContactDone('')
                    setContactFail('')
                  }}
                >
                  <MessageSquare size={18} />
                  {contactOpen ? 'Close form' : contactCfg?.cta_label || 'Open contact form'}
                </Button>
              </div>
            </Reveal>

            {contactOpen && (
              <Reveal from="up">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8 max-w-2xl">
                  {contactDone ? (
                    <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
                      <div>
                        <div className="font-bold">Message sent</div>
                        <p className="text-sm font-medium mt-1 text-emerald-700">{contactDone}</p>
                        <button
                          type="button"
                          className="mt-3 text-sm font-bold text-emerald-800 underline"
                          onClick={() => {
                            setContactDone('')
                            setContactOpen(true)
                          }}
                        >
                          Send another message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault()
                        submitContact.mutate()
                      }}
                    >
                      {contactFields.map((f) => {
                        const key = f.key
                        const required = key === 'email' ? true : !!f.required
                        const label = `${f.label || key}${required ? ' *' : ''}`
                        const val = contactValues[key] || ''
                        const err = contactErrors[key]
                        const common = {
                          value: val,
                          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            setContactValues((prev) => ({ ...prev, [key]: e.target.value }))
                            if (contactErrors[key]) {
                              setContactErrors((prev) => {
                                const next = { ...prev }
                                delete next[key]
                                return next
                              })
                            }
                          },
                        }
                        if ((f.type || 'text') === 'textarea') {
                          return (
                            <div key={key}>
                              <Textarea
                                label={label}
                                placeholder={f.placeholder || ''}
                                className="min-h-[110px]"
                                {...common}
                              />
                              {err && <p className="text-xs font-bold text-rose-600 mt-1">{err}</p>}
                            </div>
                          )
                        }
                        return (
                          <div key={key}>
                            <Input
                              label={label}
                              type={(f.type as string) || 'text'}
                              placeholder={f.placeholder || ''}
                              required={required}
                              {...common}
                            />
                            {err && <p className="text-xs font-bold text-rose-600 mt-1">{err}</p>}
                          </div>
                        )
                      })}
                      {contactFail && (
                        <p className="text-sm font-bold text-rose-600">{contactFail}</p>
                      )}
                      <Button type="submit" size="lg" disabled={submitContact.isPending} className="w-full sm:w-auto">
                        {submitContact.isPending ? 'Sending…' : contactCfg?.submit_label || 'Send message'}
                      </Button>
                    </form>
                  )}
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <BrandLogo to="/" imgClassName="h-9 w-auto max-w-[160px] brightness-0 invert" />
              <p className="text-sm font-medium mt-3 leading-relaxed text-slate-400">{footer?.subtitle}</p>
              <p className="text-xs font-medium mt-3 text-slate-500">{footer?.body}</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Product</div>
              <div className="space-y-2 text-sm font-semibold">
                <a href="#modules" className="block hover:text-emerald-400">Features</a>
                <a href="#industries" className="block hover:text-emerald-400">Industries</a>
                <a href="#menu-preview" className="block hover:text-emerald-400">Menu preview</a>
                <a href="#mod_pos" className="block hover:text-emerald-400">POS Terminal</a>
                <a href="#mod_inventory" className="block hover:text-emerald-400">Inventory</a>
                <a href="#contact" className="block hover:text-emerald-400">Contact</a>
                <Link to="/login" className="block hover:text-emerald-400">Sign in</Link>
              </div>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Industries</div>
              <div className="space-y-2 text-sm font-semibold text-slate-400">
                <div>Restaurants and fine dine</div>
                <div>QSR and cafe</div>
                <div>Grocery and kirana</div>
                <div>Supermarket and retail</div>
              </div>
            </div>
            <div>
              <div className="font-bold text-white mb-3">Social</div>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                {social.map((s: { id: number; label: string; url: string }) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="hover:text-emerald-400">
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 text-xs font-medium text-slate-500 flex flex-col sm:flex-row sm:justify-between gap-2">
            <span>© {new Date().getFullYear()} {footer?.title || 'DineFlow'}. All rights reserved.</span>
            <span>Website content managed in Super Admin CMS.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
