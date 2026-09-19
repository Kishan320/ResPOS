import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, labelize, money } from '@/lib/api'
import { Badge, Card, EmptyState, PageHeader, Spinner, StatTile, Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useT, useTEnum } from '@/i18n/useT'
import {
  Coins,
  Package,
  Receipt,
  ShoppingBag,
  AlertTriangle,
  Building2,
  Users,
  Monitor,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export default function DashboardPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const user = useAuthStore((s) => s.user)
  const t = useT()
  const tEnum = useTEnum()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', orgId],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <EmptyState
          title={t('dashboard.couldNotLoad')}
          description={
            user?.role === 'super_admin' && !orgId
              ? t('dashboard.platformLoadingHint')
              : t('dashboard.selectOrgHint')
          }
          action={
            user?.role === 'super_admin' ? (
              <Link to="/app/organizations">
                <Button>{t('dashboard.goToOrganizations')}</Button>
              </Link>
            ) : undefined
          }
        />
      </Card>
    )
  }

  if (data.scope === 'platform') {
    return (
      <div>
        <PageHeader
          breadcrumb={t('orgs.breadcrumb')}
          title={t('dashboard.commandCenter')}
          subtitle={t('dashboard.commandCenterSubtitle')}
          actions={
            <Link to="/app/organizations">
              <Button>
                {t('dashboard.manageOrganizations')} <ArrowRight size={16} />
              </Button>
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatTile tone="brand" icon={<Building2 size={18} />} label={t('dashboard.tile.organizations')} value={String(data.organizations)} hint={t('dashboard.tile.activeOrgs', { count: data.active_organizations ?? 0 })} />
          <StatTile icon={<ShoppingBag size={18} />} label={t('dashboard.tile.ordersAll')} value={String(data.orders_total)} />
          <StatTile icon={<Coins size={18} />} label={t('dashboard.tile.revenueAll')} value={money(data.revenue_total)} />
          <StatTile icon={<Users size={18} />} label={t('dashboard.tile.users')} value={String(data.users_total ?? 0)} hint={t('dashboard.tile.productsHint', { count: data.products_total ?? 0 })} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title={t('dashboard.businessMix')} subtitle={t('dashboard.businessMixSubtitle')}>
            <div className="grid sm:grid-cols-2 gap-3">
              {(data.by_business_type || []).length === 0 ? (
                <p className="text-sm text-slate-500">{t('dashboard.noOrganizationsYet')}</p>
              ) : (
                (data.by_business_type || []).map((b: { type: string; count: number }) => (
                  <div key={String(b.type)} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
                    <span className="font-medium capitalize">{tEnum('businessTypes', b?.type, labelize(b?.type))}</span>
                    <Badge tone="info">{b.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card title={t('dashboard.recentTenants')} subtitle={t('dashboard.recentTenantsSubtitle')}>
            <div className="space-y-3">
              {(data.recent_organizations || []).map((o: { id: number; name: string; business_type?: string; city?: string; is_active: boolean }) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.name}</div>
                    <div className="text-xs text-ink-500 capitalize truncate">
                      {o.business_type ? tEnum('businessTypes', o.business_type, labelize(o.business_type)) : '-'}
                      {o.city ? ` · ${o.city}` : ''}
                    </div>
                  </div>
                  <Badge tone={o.is_active ? 'success' : 'neutral'}>{o.is_active ? t('common.live') : t('common.off')}</Badge>
                </div>
              ))}
              {!data.recent_organizations?.length && <p className="text-sm text-ink-500">{t('dashboard.nothingYet')}</p>}
            </div>
          </Card>
        </div>

        <Card className="mt-4" title={t('dashboard.launchChecklist')} subtitle={t('dashboard.launchChecklistSubtitle')}>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              t('dashboard.step.createOrg'),
              t('dashboard.step.selectActive'),
              t('dashboard.step.addCatalog'),
              t('dashboard.step.firstBill'),
            ].map((step, i) => (
              <li key={step} className="rounded-2xl bg-ink-50 dark:bg-ink-950 border border-ink-100 dark:border-ink-800 p-4">
                <div className="text-brand-600 font-black text-lg">{String(i + 1).padStart(2, '0')}</div>
                <div className="text-sm mt-2 text-ink-700 dark:text-ink-200">{step}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    )
  }

  const week = (data.week || []) as Array<{ date: string; revenue: string; orders: number }>
  const maxRev = Math.max(...week.map((w) => Number(w.revenue) || 0), 1)
  const payMix = (data.payment_mix || []) as Array<{ method: string; amount: string; count: number }>
  const top = (data.top_products || []) as Array<{ name: string; qty: string; revenue: string }>
  const recent = (data.recent_orders || []) as Array<{
    id: number
    order_number: string
    status: string
    grand_total: string
    order_type?: string
  }>

  return (
    <div>
      <PageHeader
        breadcrumb={t('inventory.breadcrumb')}
        title={t('dashboard.storeDashboard')}
        subtitle={t('dashboard.storeDashboardSubtitle')}
        actions={
          <Link to="/app/pos">
            <Button size="lg">
              <ShoppingBag size={16} /> {t('nav.openPos')}
            </Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile tone="brand" icon={<Coins size={18} />} label={t('dashboard.tile.revenueToday')} value={money(data.revenue_today)} hint={t('dashboard.tile.ordersHint', { count: data.orders_today })} />
        <StatTile icon={<Receipt size={18} />} label={t('dashboard.tile.invoicesToday')} value={String(data.invoices_today)} />
        <StatTile icon={<Package size={18} />} label={t('dashboard.tile.activeProducts')} value={String(data.active_products)} hint={t('dashboard.tile.categoriesHint', { count: data.categories ?? 0 })} />
        <StatTile
          tone={Number(data.low_stock_count) > 0 ? 'warning' : 'default'}
          icon={<AlertTriangle size={18} />}
          label={t('dashboard.tile.lowStock')}
          value={String(data.low_stock_count)}
          hint={t('dashboard.tile.openOrdersHint', { count: data.open_orders })}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile icon={<Monitor size={18} />} label={t('dashboard.tile.activeTerminals')} value={String(data.active_terminals ?? 0)} />
        <StatTile icon={<Users size={18} />} label={t('dashboard.tile.customers')} value={String(data.customers ?? 0)} />
        <StatTile icon={<TrendingUp size={18} />} label={t('dashboard.tile.openHeld')} value={String(data.open_orders)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2" title={t('dashboard.last7Days')} subtitle={t('dashboard.last7DaysSubtitle')}>
          {week.length === 0 ? (
            <p className="text-sm text-ink-500">{t('dashboard.noSalesThisWeek')}</p>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {week.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] text-ink-400 opacity-0 group-hover:opacity-100 transition">
                    {money(d.revenue)}
                  </div>
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-brand-700 to-brand-400 min-h-[6px] shadow-sm"
                    style={{ height: `${Math.max(6, (Number(d.revenue) / maxRev) * 100)}%` }}
                  />
                  <div className="text-[10px] text-ink-400">{String(d.date).slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={t('dashboard.paymentMix')} subtitle={t('dashboard.paymentMixSubtitle')}>
          {payMix.length === 0 ? (
            <p className="text-sm text-ink-500">{t('dashboard.noPaymentsYet')}</p>
          ) : (
            <div className="space-y-3">
              {payMix.map((p) => (
                <div key={p.method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium">{p.method}</span>
                    <span className="text-ink-500">{money(p.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      style={{
                        width: `${Math.min(100, (Number(p.amount) / Math.max(...payMix.map((x) => Number(x.amount)), 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-ink-400 mt-1">{t('dashboard.txnCount', { count: p.count })}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={t('dashboard.topProducts')} subtitle={t('dashboard.topProductsSubtitle')}>
          {top.length === 0 ? (
            <p className="text-sm text-ink-500">{t('dashboard.sellSomething')}</p>
          ) : (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-ink-500">{t('dashboard.qtyLabel', { qty: Number(p.qty) })}</div>
                  </div>
                  <div className="font-semibold text-sm">{money(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t('dashboard.recentOrders')}
          subtitle={t('dashboard.recentOrdersSubtitle')}
          action={
            <Link to="/app/orders" className="text-xs font-semibold text-brand-600">
              {t('dashboard.viewAll')}
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">{t('dashboard.noOrdersYet')}</p>
          ) : (
            <div className="space-y-3">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.order_number}</div>
                    <div className="text-xs text-ink-500 capitalize">{o.order_type ? tEnum('orderType', o.order_type, labelize(o.order_type)) : '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{money(o.grand_total)}</div>
                    <Badge tone={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}>
                      {o.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
