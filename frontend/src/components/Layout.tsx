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
import { useEffect, useState } from 'react'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  accent?: boolean
  superOnly?: boolean
  group?: string
}

const nav: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true, group: 'Main' },
  { to: '/app/pos', label: 'POS Terminal', icon: ShoppingCart, accent: true, group: 'Main' },
  { to: '/app/products', label: 'Products & Menu', icon: Package, group: 'Catalog' },
  { to: '/app/categories', label: 'Categories', icon: Tags, group: 'Catalog' },
  { to: '/app/inventory', label: 'Inventory & Stock', icon: Warehouse, group: 'Catalog' },
  { to: '/app/orders', label: 'Orders & Sales', icon: Receipt, group: 'Sales' },
  { to: '/app/invoices', label: 'Invoices & Bills', icon: Receipt, group: 'Sales' },
  { to: '/app/reports', label: 'Report Hub', icon: BarChart3, group: 'Sales' },
  {
    to: '/app/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management',
    label: 'Discounts & Offers',
    icon: Percent,
    group: 'Sales',
  },
  { to: '/app/restaurant', label: 'Tables · Waiters · Tax', icon: Monitor, group: 'Restaurant' },
  { to: '/app/terminals', label: 'POS Machines', icon: Monitor, group: 'Restaurant' },
  { to: '/app/customers', label: 'Customers', icon: Contact, group: 'People' },
  {
    to: '/app/contact-messages',
    label: 'Contact messages',
    icon: Mail,
    superOnly: true,
    group: 'People',
  },
  {
    to: '/app/organization-owner-admin-staff-user-creation-with-full-rbac-permission',
    label: 'Staff & Permissions',
    icon: Users,
    group: 'People',
  },
  { to: '/app/users', label: 'Team Directory', icon: Users, group: 'People' },
  { to: '/app/currency', label: 'World Currencies', icon: Coins, group: 'Finance' },
  { to: '/app/organizations', label: 'Organizations', icon: Building2, superOnly: true, group: 'Platform' },
  { to: '/app/cms', label: 'CMS & Landing', icon: Globe2, superOnly: true, group: 'Platform' },
  { to: '/app/rbac', label: 'Org Module Access', icon: Shield, superOnly: true, group: 'Platform' },
  {
    to: '/app/super-admin-platform-operations-user-and-full-rbac-management',
    label: 'Platform Users',
    icon: Shield,
    superOnly: true,
    group: 'Platform',
  },
  { to: '/app/settings', label: 'Settings', icon: Settings2, group: 'Account' },
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'light')
  }, [theme])

  const links = nav.filter((n) => !n.superOnly || user?.role === 'super_admin')
  const groups = Array.from(new Set(links.map((l) => l.group || 'Main')))

  const SidebarBody = (
    <>
      <div className="px-4 py-5 border-b border-white/5">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <BrandLogo
            to="/app"
            collapsed={sidebarCollapsed}
            imgClassName={
              sidebarCollapsed
                ? 'h-10 w-10 rounded-xl bg-white p-1'
                : 'h-9 w-auto max-w-[148px] brightness-0 invert'
            }
          />
        </div>
        {!sidebarCollapsed && (
          <div className="mt-2 text-[10px] text-slate-400 uppercase tracking-[0.16em] font-semibold px-0.5">
            Store operations platform
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g) => (
          <div key={g} className="mb-2">
            {!sidebarCollapsed && <div className="nav-group-label">{g}</div>}
            <div className="space-y-0.5">
              {links
                .filter((i) => (i.group || 'Main') === g)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    title={item.label}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition',
                        sidebarCollapsed && 'justify-center',
                        isActive
                          ? item.accent
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                            : 'bg-white/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    <item.icon size={18} className="shrink-0 opacity-90" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {!sidebarCollapsed && (
          <div className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-3 text-xs">
            <div className="text-white font-semibold truncate">{user?.full_name}</div>
            <div className="text-slate-400 capitalize mt-0.5 font-medium">
              {String(user?.role || '').replace(/_/g, ' ')}
            </div>
            {(organizationName || organizationId) && (
              <div className="mt-2 text-emerald-300/90 truncate font-medium" title={organizationName || undefined}>
                {organizationName || `Org #${organizationId}`}
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
            'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && 'Sign out'}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-full flex mesh-bg">
      <aside
        className={cn(
          'hidden lg:flex flex-col text-slate-300 no-print transition-all duration-200 sticky top-0 h-screen shrink-0',
          'bg-gradient-to-b from-[#0b1220] to-[#0f172a] border-r border-white/5',
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
          <aside className="relative w-[280px] h-full flex flex-col bg-[#0b1220]">
            <button className="absolute right-3 top-4 text-white p-2" onClick={() => setMobileOpen(false)}>
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
                    (user?.role === 'super_admin' ? 'Platform control center' : 'Your workspace')}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Multi-tenant · multi-currency · restaurant & retail
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NavLink to="/app/pos">
                <span className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 shadow-md shadow-emerald-600/20 transition">
                  <ShoppingCart size={14} /> Open POS
                </span>
              </NavLink>
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
