import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, money } from '@/lib/api'
import { Card, EmptyState, PageHeader, Select, Spinner, StatTile, Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { BarChart3, IndianRupee, ShoppingBag, Printer } from 'lucide-react'
import { useT } from '@/i18n/useT'

export default function ReportsPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const [days, setDays] = useState('30')
  const [report, setReport] = useState<'cashier' | 'daily' | 'detailed' | 'item' | 'today'>('cashier')

  const q = useQuery({
    queryKey: ['reports', report, orgId, days],
    enabled: !!orgId,
    queryFn: async () => {
      if (report === 'cashier') return (await api.get('/reports/cashier', { params: { days: Number(days) } })).data
      if (report === 'daily') return (await api.get('/reports/daily-sales', { params: { days: Number(days) } })).data
      if (report === 'detailed') return (await api.get('/reports/sales-detailed', { params: { days: Number(days) } })).data
      if (report === 'item') return (await api.get('/reports/item-wise', { params: { days: Number(days) } })).data
      return (await api.get('/reports/todays-sale')).data
    },
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} description={t('reports.selectOrgHint')} /></Card>
  }

  const tabs = [
    ['cashier', t('reports.tab.cashier')],
    ['daily', t('reports.tab.daily')],
    ['detailed', t('reports.tab.detailed')],
    ['item', t('reports.tab.item')],
    ['today', t('reports.tab.today')],
  ] as const

  return (
    <div>
      <PageHeader
        breadcrumb={t('reports.breadcrumb')}
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <div className="flex gap-2">
            <Select className="w-36" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">{t('reports.range.today')}</option>
              <option value="7">{t('reports.range.7')}</option>
              <option value="30">{t('reports.range.30')}</option>
              <option value="90">{t('reports.range.90')}</option>
            </Select>
            <Button variant="secondary" onClick={() => window.print()}><Printer size={14} /> {t('common.print')}</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setReport(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold border ${
              report === k ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : report === 'cashier' ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatTile tone="brand" icon={<ShoppingBag size={18} />} label={t('reports.tile.bills')} value={String(q.data?.totals?.bills ?? 0)} />
            <StatTile icon={<IndianRupee size={18} />} label={t('reports.tile.value')} value={money(q.data?.totals?.value)} />
            <StatTile icon={<BarChart3 size={18} />} label={t('reports.tile.tax')} value={money(q.data?.totals?.tax)} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title={t('reports.byBillType')} subtitle={t('reports.byBillTypeSubtitle')}>
              <div className="space-y-3">
                {(q.data?.by_bill_type || []).map((r: { bill_type: string; bills: number; total_value: string; tax_total: string }) => (
                  <div key={r.bill_type} className="flex justify-between items-center rounded-2xl border border-slate-200 p-3">
                    <div>
                      <div className="font-bold capitalize">{r.bill_type}</div>
                      <div className="text-xs text-slate-500">{t('reports.billsWithTax', { count: r.bills, tax: money(r.tax_total) })}</div>
                    </div>
                    <div className="font-black">{money(r.total_value)}</div>
                  </div>
                ))}
                {!q.data?.by_bill_type?.length && <p className="text-sm text-slate-500">{t('reports.noSalesInRange')}</p>}
              </div>
            </Card>
            <Card title={t('reports.byPaymentMethod')}>
              <div className="space-y-3">
                {(q.data?.by_payment_method || []).map((r: { method: string; count: number; amount: string }) => (
                  <div key={r.method} className="flex justify-between rounded-2xl border border-slate-200 p-3">
                    <div className="font-bold capitalize">{r.method} · {r.count}</div>
                    <div className="font-black">{money(r.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : report === 'today' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatTile tone="brand" label={t('reports.todayGrandTotal')} value={money(q.data?.grand_total)} hint={t('reports.billsCount', { count: q.data?.bill_count || 0 })} />
          <StatTile label={t('reports.openHeldDraft')} value={String(q.data?.open_orders ?? 0)} />
          {(q.data?.by_bill_type || []).map((r: { bill_type: string; bills: number; total: string }) => (
            <StatTile key={r.bill_type} label={`${r.bill_type} ${t('reports.tile.bills')}`} value={money(r.total)} hint={t('reports.billsCount', { count: r.bills })} />
          ))}
        </div>
      ) : report === 'item' ? (
        <div className="premium-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">                <tr>
                  <th className="text-left px-4 py-3">{t('reports.itemTable.item')}</th>
                  <th className="text-right px-4 py-3">{t('reports.itemTable.qty')}</th>
                  <th className="text-right px-4 py-3">{t('reports.itemTable.sales')}</th>
                  <th className="text-right px-4 py-3">{t('reports.itemTable.tax')}</th>
                  <th className="text-right px-4 py-3">{t('reports.itemTable.bills')}</th>
                </tr>
            </thead>
            <tbody>
              {(q.data?.rows || []).map((r: { item: string; quantity: string; sales_value: string; tax_amount: string; bills: number }) => (
                <tr key={r.item} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold">{r.item}</td>
                  <td className="px-4 py-3 text-right">{Number(r.quantity)}</td>
                  <td className="px-4 py-3 text-right font-bold">{money(r.sales_value)}</td>
                  <td className="px-4 py-3 text-right">{money(r.tax_amount)}</td>
                  <td className="px-4 py-3 text-right">{r.bills}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data?.rows?.length && <div className="p-8"><EmptyState title={t('reports.empty.item')} /></div>}
        </div>
      ) : report === 'detailed' ? (
        <div className="space-y-4">
          {(q.data?.rows || []).map((o: { bill_no: string; date?: string; grand_total: string; tax_amount: string; bill_type?: string; items: Array<{ name: string; qty: string; price: string; total: string }> }) => (
            <Card key={o.bill_no} title={o.bill_no} subtitle={`${o.date || ''} · ${o.bill_type || ''} · ${money(o.grand_total)}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left py-1">{t('reports.itemTable.item')}</th>
                    <th className="text-right py-1">{t('reports.itemTable.qty')}</th>
                    <th className="text-right py-1">{t('common.price')}</th>
                    <th className="text-right py-1">{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items?.map((i, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="py-1.5">{i.name}</td>
                      <td className="text-right">{i.qty}</td>
                      <td className="text-right">{money(i.price)}</td>
                      <td className="text-right font-bold">{money(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
          {!q.data?.rows?.length && <Card><EmptyState title={t('reports.empty.detailed')} /></Card>}
        </div>
      ) : (
        <div className="premium-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">                <tr>
                  <th className="text-left px-4 py-3">{t('reports.table.billNo')}</th>
                  <th className="text-left px-4 py-3">{t('reports.table.salesCode')}</th>
                  <th className="text-left px-4 py-3">{t('reports.table.type')}</th>
                  <th className="text-right px-4 py-3">{t('reports.table.amount')}</th>
                  <th className="text-right px-4 py-3">{t('reports.table.tax')}</th>
                  <th className="text-right px-4 py-3">{t('reports.table.grand')}</th>
                  <th className="text-right px-4 py-3">{t('reports.table.paid')}</th>
                </tr>
            </thead>
            <tbody>
              {(q.data?.rows || []).map((r: { bill_no: string; sales_code: string; bill_type?: string; bill_amount: string; tax_amount: string; grand_total: string; paid: string }) => (
                <tr key={r.bill_no} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold">{r.bill_no}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.sales_code}</td>
                  <td className="px-4 py-3 capitalize">{r.bill_type}</td>
                  <td className="px-4 py-3 text-right">{money(r.bill_amount)}</td>
                  <td className="px-4 py-3 text-right">{money(r.tax_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold">{money(r.grand_total)}</td>
                  <td className="px-4 py-3 text-right">{money(r.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data?.rows?.length && <div className="p-8"><EmptyState title={t('reports.empty.daily')} /></div>}
        </div>
      )}
    </div>
  )
}
