import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Receipt,
  Building2,
  Users,
  Monitor,
  Moon,
  Sun,
  LogOut,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Contact,
  Settings2,
  Menu,
  X,
  Percent,
  Shield,
  Globe2,
  Coins,
  Mail,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/components/ui'
import BrandLogo from '@/components/BrandLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useT, useTEnum } from '@/i18n/useT'
import { useEffect, useState } from 'react'

type NavItem = {
  to: string
  labelKey: Parameters<ReturnType<typeof useT>>[0]
  icon: typeof LayoutDashboard
  end?: boolean
  accent?: boolean
  superOnly?: boolean
  groupKey: Parameters<ReturnType<typeof useT>>[0]
}

const nav: NavItem[] = [
  { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, groupKey: 'nav.group.main' },
  { to: '/app/pos', labelKey: 'nav.posTerminal', icon: ShoppingCart, accent: true, groupKey: 'nav.group.main' },
  { to: '/app/products', labelKey: 'nav.productsMenu', icon: Package, groupKey: 'nav.group.catalog' },
  { to: '/app/categories', labelKey: 'nav.categories', icon: Tags, groupKey: 'nav.group.catalog' },
  { to: '/app/inventory', labelKey: 'nav.inventoryStock', icon: Warehouse, groupKey: 'nav.group.catalog' },
  { to: '/app/orders', labelKey: 'nav.ordersSales', icon: Receipt, groupKey: 'nav.group.sales' },
  { to: '/app/invoices', labelKey: 'nav.invoicesBills', icon: Receipt, groupKey: 'nav.group.sales' },
  { to: '/app/reports', labelKey: 'nav.reportHub', icon: BarChart3, groupKey: 'nav.group.sales' },
  {
    to: '/app/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management',
    labelKey: 'nav.discountsOffers',
    icon: Percent,
    groupKey: 'nav.group.sales',
  },
  { to: '/app/restaurant', labelKey: 'nav.tablesWaitersTax', icon: Monitor, groupKey: 'nav.group.restaurant' },
  { to: '/app/terminals', labelKey: 'nav.posMachines', icon: Monitor, groupKey: 'nav.group.restaurant' },
  { to: '/app/customers', labelKey: 'nav.customers', icon: Contact, groupKey: 'nav.group.people' },
  {
    to: '/app/contact-messages',
    labelKey: 'nav.contactMessages',
    icon: Mail,
    superOnly: true,
    groupKey: 'nav.group.people',
  },
  {
    to: '/app/organization-owner-admin-staff-user-creation-with-full-rbac-permission',
    labelKey: 'nav.staffPermissions',
    icon: Users,
    groupKey: 'nav.group.people',
  },
  { to: '/app/users', labelKey: 'nav.teamDirectory', icon: Users, groupKey: 'nav.group.people' },
  { to: '/app/currency', labelKey: 'nav.worldCurrencies', icon: Coins, groupKey: 'nav.group.finance' },
  { to: '/app/organizations', labelKey: 'nav.organizations', icon: Building2, superOnly: true, groupKey: 'nav.group.platform' },
  { to: '/app/cms', labelKey: 'nav.cmsLanding', icon: Globe2, superOnly: true, groupKey: 'nav.group.platform' },
  { to: '/app/rbac', labelKey: 'nav.orgModuleAccess', icon: Shield, superOnly: true, groupKey: 'nav.group.platform' },
  {
    to: '/app/super-admin-platform-operations-user-and-full-rbac-management',
    labelKey: 'nav.platformUsers',
    icon: Shield,
    superOnly: true,
    groupKey: 'nav.group.platform',
  },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings2, groupKey: 'nav.group.account' },
]

export default function Layout() {
  const {
    user,
    organizationName,
    organizationId,
    theme,
    setTheme,
    logout,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useT()
  const tEnum = useTEnum()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'light')
  }, [theme])

  const links = nav.filter((n) => !n.superOnly || user?.role === 'super_admin')
  const groups = Array.from(new Set(links.map((l) => l.groupKey)))

  const SidebarBody = (
    <>
      <div className="px-4 py-5 border-b border-slate-200 dark:border-white/5">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <BrandLogo
            to="/app"
            collapsed={sidebarCollapsed}
            imgClassName={
              sidebarCollapsed
                ? 'h-10 w-10 rounded-xl bg-white p-1'
                : theme === 'dark'
                  ? 'h-9 w-auto max-w-[148px] brightness-0 invert'
                  : 'h-9 w-auto max-w-[148px]'
            }
          />
        </div>
        {!sidebarCollapsed && (
          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.16em] font-semibold px-0.5">
            {t('nav.storeOpsPlatform')}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g) => (
          <div key={g} className="mb-2">
            {!sidebarCollapsed && <div className="nav-group-label">{t(g)}</div>}
            <div className="space-y-0.5">
              {links
                .filter((i) => i.groupKey === g)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    title={t(item.labelKey)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition',
                        sidebarCollapsed && 'justify-center',
                        isActive
                          ? item.accent
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-white/10 dark:text-white'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                      )
                    }
                  >
                    <item.icon size={18} className="shrink-0 opacity-90" />
                    {!sidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {!sidebarCollapsed && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 dark:bg-white/[0.04] dark:border-white/5 px-3 py-3 text-xs">
            <div className="text-slate-900 dark:text-white font-semibold truncate">{user?.full_name}</div>
            <div className="text-slate-500 dark:text-slate-400 capitalize mt-0.5 font-medium">
              {tEnum('roles', user?.role, String(user?.role || '').replace(/_/g, ' '))}
            </div>
            {(organizationName || organizationId) && (
              <div className="mt-2 text-emerald-700 dark:text-emerald-300/90 truncate font-medium" title={organizationName || undefined}>
                {organizationName || t('nav.orgNumber', { id: organizationId ?? '' })}
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && t('nav.signOut')}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-full flex mesh-bg">
      <aside
        className={cn(
          'hidden lg:flex flex-col text-slate-600 dark:text-slate-300 no-print transition-all duration-200 sticky top-0 h-screen shrink-0',
          'bg-white dark:bg-gradient-to-b dark:from-[#0b1220] dark:to-[#0f172a] border-r border-slate-200 dark:border-white/5',
          sidebarCollapsed ? 'w-[76px]' : 'w-[272px]'
        )}
      >
        {SidebarBody}
      </aside>

      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:flex fixed z-30 top-[4.5rem] items-center justify-center h-7 w-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md text-slate-500 hover:text-emerald-600"
        style={{ left: sidebarCollapsed ? 62 : 258 }}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] h-full flex flex-col bg-white dark:bg-[#0b1220]">
            <button className="absolute right-3 top-4 text-slate-500 dark:text-white p-2" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl no-print">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {organizationName ||
                    (user?.role === 'super_admin' ? t('nav.platformControlCenter') : t('nav.yourWorkspace'))}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t('nav.headerTagline')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NavLink to="/app/pos">
                <span className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 shadow-md shadow-emerald-600/20 transition">
                  <ShoppingCart size={14} /> {t('nav.openPos')}
                </span>
              </NavLink>
              <LanguageSwitcher />
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-[1440px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
