import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, labelize, money } from '@/lib/api'
import { Badge, Card, EmptyState, PageHeader, Spinner, StatTile, Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
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
          title="Could not load dashboard"
          description={
            user?.role === 'super_admin' && !orgId
              ? 'Platform data may be loading. Or select a tenant from Organizations.'
              : 'Select an organization if you are super admin.'
          }
          action={
            user?.role === 'super_admin' ? (
              <Link to="/app/organizations">
                <Button>Go to Organizations</Button>
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
          breadcrumb="Platform"
          title="Command center"
          subtitle="Super admin overview across every restaurant, cafe, grocery & retail tenant."
          actions={
            <Link to="/app/organizations">
              <Button>
                Manage organizations <ArrowRight size={16} />
              </Button>
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatTile tone="brand" icon={<Building2 size={18} />} label="Organizations" value={String(data.organizations)} hint={`${data.active_organizations ?? 0} active`} />
          <StatTile icon={<ShoppingBag size={18} />} label="Orders (all)" value={String(data.orders_total)} />
          <StatTile icon={<Coins size={18} />} label="Revenue (all)" value={money(data.revenue_total)} />
          <StatTile icon={<Users size={18} />} label="Users" value={String(data.users_total ?? 0)} hint={`${data.products_total ?? 0} products`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Business mix" subtitle="Tenants by type">
            <div className="grid sm:grid-cols-2 gap-3">
              {(data.by_business_type || []).length === 0 ? (
                <p className="text-sm text-slate-500">No organizations yet - create your first tenant.</p>
              ) : (
                (data.by_business_type || []).map((b: { type: string; count: number }) => (
                  <div key={String(b.type)} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
                    <span className="font-medium capitalize">{labelize(b?.type)}</span>
                    <Badge tone="info">{b.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card title="Recent tenants" subtitle="Latest onboarded">
            <div className="space-y-3">
              {(data.recent_organizations || []).map((o: { id: number; name: string; business_type?: string; city?: string; is_active: boolean }) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.name}</div>
                    <div className="text-xs text-ink-500 capitalize truncate">
                      {o.business_type ? labelize(o.business_type) : '-'}
                      {o.city ? ` · ${o.city}` : ''}
                    </div>
                  </div>
                  <Badge tone={o.is_active ? 'success' : 'neutral'}>{o.is_active ? 'Live' : 'Off'}</Badge>
                </div>
              ))}
              {!data.recent_organizations?.length && <p className="text-sm text-ink-500">Nothing yet.</p>}
            </div>
          </Card>
        </div>

        <Card className="mt-4" title="Launch checklist" subtitle="Get a shop live in minutes">
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              'Create an organization (any business type)',
              'Select it as active tenant',
              'Add categories, products & terminal',
              'Open POS and complete first bill',
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
        breadcrumb="Operations"
        title="Store dashboard"
        subtitle="Live performance for the active organization - sales, stock, payments & more."
        actions={
          <Link to="/app/pos">
            <Button size="lg">
              <ShoppingBag size={16} /> Open POS
            </Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile tone="brand" icon={<Coins size={18} />} label="Revenue today" value={money(data.revenue_today)} hint={`${data.orders_today} orders`} />
        <StatTile icon={<Receipt size={18} />} label="Invoices today" value={String(data.invoices_today)} />
        <StatTile icon={<Package size={18} />} label="Active products" value={String(data.active_products)} hint={`${data.categories ?? 0} categories`} />
        <StatTile
          tone={Number(data.low_stock_count) > 0 ? 'warning' : 'default'}
          icon={<AlertTriangle size={18} />}
          label="Low stock"
          value={String(data.low_stock_count)}
          hint={`${data.open_orders} open orders`}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile icon={<Monitor size={18} />} label="Active terminals" value={String(data.active_terminals ?? 0)} />
        <StatTile icon={<Users size={18} />} label="Customers" value={String(data.customers ?? 0)} />
        <StatTile icon={<TrendingUp size={18} />} label="Open / held" value={String(data.open_orders)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2" title="Last 7 days revenue" subtitle="Completed sales only">
          {week.length === 0 ? (
            <p className="text-sm text-ink-500">No completed sales this week yet.</p>
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

        <Card title="Payment mix" subtitle="Last 30 days">
          {payMix.length === 0 ? (
            <p className="text-sm text-ink-500">No payments yet.</p>
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
                  <div className="text-[11px] text-ink-400 mt-1">{p.count} txns</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Top products" subtitle="Revenue leaders · 30 days">
          {top.length === 0 ? (
            <p className="text-sm text-ink-500">Sell something to populate this list.</p>
          ) : (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-ink-500">Qty {Number(p.qty)}</div>
                  </div>
                  <div className="font-semibold text-sm">{money(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent orders"
          subtitle="Latest activity"
          action={
            <Link to="/app/orders" className="text-xs font-semibold text-brand-600">
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.order_number}</div>
                    <div className="text-xs text-ink-500 capitalize">{o.order_type ? labelize(o.order_type) : '-'}</div>
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
