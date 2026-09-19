import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Page } from '@/lib/api'
import { Alert, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Plus } from 'lucide-react'
import { useT } from '@/i18n/useT'

type Waiter = { id: number; name: string; code?: string; phone?: string; is_active: boolean }
type Table = { id: number; name: string; code?: string; capacity: number; area?: string; is_active: boolean; is_occupied: boolean }
type Tax = { id: number; name: string; code: string; rate: string | number; is_default: boolean; is_active: boolean }

export default function RestaurantOpsPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const [tab, setTab] = useState<'tables' | 'waiters' | 'taxes' | 'settings'>('tables')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const qc = useQueryClient()

  const tables = useQuery({
    queryKey: ['tables', orgId],
    enabled: !!orgId && tab === 'tables',
    queryFn: async () => (await api.get<Page<Table>>('/restaurant/tables', { params: { page_size: 200 } })).data,
  })
  const waiters = useQuery({
    queryKey: ['waiters', orgId],
    enabled: !!orgId && tab === 'waiters',
    queryFn: async () => (await api.get<Page<Waiter>>('/restaurant/waiters', { params: { page_size: 200 } })).data,
  })
  const taxes = useQuery({
    queryKey: ['taxes', orgId],
    enabled: !!orgId && tab === 'taxes',
    queryFn: async () => (await api.get<Page<Tax>>('/restaurant/taxes', { params: { page_size: 200 } })).data,
  })
  const settings = useQuery({
    queryKey: ['rest-settings', orgId],
    enabled: !!orgId && tab === 'settings',
    queryFn: async () => (await api.get('/restaurant/settings')).data,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      if (tab === 'tables') {
        return api.post('/restaurant/tables', {
          name: form.name,
          capacity: Number(form.capacity || 4),
          area: form.area || null,
        })
      }
      if (tab === 'waiters') {
        return api.post('/restaurant/waiters', { name: form.name, phone: form.phone || null })
      }
      if (tab === 'taxes') {
        return api.post('/restaurant/taxes', {
          name: form.name,
          code: form.code || form.name.slice(0, 6).toUpperCase(),
          rate: Number(form.rate || 0),
          is_default: form.is_default === '1',
        })
      }
      return api.patch('/restaurant/settings', {
        bill_header: form.bill_header,
        bill_footer: form.bill_footer,
        enable_kot: form.enable_kot !== '0',
        enable_table_management: form.enable_table !== '0',
        enable_waiter: form.enable_waiter !== '0',
        currency_symbol: form.currency_symbol || 'AED',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['waiters'] })
      qc.invalidateQueries({ queryKey: ['taxes'] })
      qc.invalidateQueries({ queryKey: ['rest-settings'] })
      setOpen(false)
      setForm({})
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} description={t('restaurant.selectOrgHint')} /></Card>
  }

  const tabs = [
    ['tables', t('restaurant.tab.tables')],
    ['waiters', t('restaurant.tab.waiters')],
    ['taxes', t('restaurant.tab.taxes')],
    ['settings', t('restaurant.tab.settings')],
  ] as const

  const addLabels = { tables: t('restaurant.addTable'), waiters: t('restaurant.addWaiter'), taxes: t('restaurant.addTax') } as const

  return (
    <div>
      <PageHeader
        breadcrumb={t('restaurant.breadcrumb')}
        title={t('restaurant.title')}
        subtitle={t('restaurant.subtitle')}
        actions={
          tab !== 'settings' ? (
            <Button onClick={() => { setError(''); setForm({}); setOpen(true) }}>
              <Plus size={16} /> {addLabels[tab]}
            </Button>
          ) : (
            <Button onClick={() => {
              const s = settings.data?.settings || {}
              setForm({
                bill_header: s.bill_header || '',
                bill_footer: s.bill_footer || '',
                currency_symbol: s.currency_symbol || '₹',
                enable_kot: s.enable_kot === false ? '0' : '1',
                enable_table: s.enable_table_management === false ? '0' : '1',
                enable_waiter: s.enable_waiter === false ? '0' : '1',
              })
              setError('')
              setOpen(true)
            }}>
              {t('restaurant.editSettings')}
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-bold border ${
              tab === k ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tables' && (
        tables.isLoading ? <Spinner /> : !tables.data?.items?.length ? (
          <Card><EmptyState title={t('restaurant.empty.tables')} description={t('restaurant.empty.tablesHint')} /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tables.data.items.map((tb) => (
              <div key={tb.id} className="premium-card p-4">
                <div className="flex justify-between items-start">
                  <div className="font-black text-lg text-slate-900 dark:text-white">{tb.name}</div>
                  <Badge tone={tb.is_occupied ? 'warning' : 'success'}>{tb.is_occupied ? t('restaurant.occupied') : t('restaurant.free')}</Badge>
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  {t('restaurant.capacity', { capacity: tb.capacity, area: tb.area || t('restaurant.mainFloor') })}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">{tb.code}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'waiters' && (
        waiters.isLoading ? <Spinner /> : !waiters.data?.items?.length ? (
          <Card><EmptyState title={t('restaurant.empty.waiters')} /></Card>
        ) : (
          <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">{t('restaurant.table.name')}</th>
                  <th className="text-left px-4 py-3">{t('restaurant.table.code')}</th>
                  <th className="text-left px-4 py-3">{t('restaurant.table.phone')}</th>
                  <th className="text-left px-4 py-3">{t('restaurant.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {waiters.data.items.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-bold">{w.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                    <td className="px-4 py-3">{w.phone || '-'}</td>
                    <td className="px-4 py-3"><Badge tone={w.is_active ? 'success' : 'neutral'}>{w.is_active ? t('common.active') : t('common.off')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'taxes' && (
        taxes.isLoading ? <Spinner /> : !taxes.data?.items?.length ? (
          <Card><EmptyState title={t('restaurant.empty.taxes')} description={t('restaurant.empty.taxesHint')} /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {taxes.data.items.map((t) => (
              <div key={t.id} className="premium-card p-4">
                <div className="font-black text-slate-900 dark:text-white">{t.name}</div>
                <div className="text-2xl font-black text-orange-600 mt-2">{Number(t.rate)}%</div>
                <div className="text-xs font-mono text-slate-500 mt-1">{t.code}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'settings' && (
        settings.isLoading ? <Spinner /> : (
          <Card title={t('restaurant.settingsTitle')} subtitle={settings.data?.name}>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(settings.data?.settings || {}).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{String(k).replace(/_/g, ' ')}</dt>
                  <dd className="font-bold text-slate-900 dark:text-white mt-1 break-all">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={tab === 'settings' ? t('restaurant.editSettings') : addLabels[tab]}>
        <div className="space-y-3">
          {tab === 'tables' && (
            <>
              <Input label={t('restaurant.form.tableName')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('restaurant.form.tableNamePlaceholder')} />
              <Input label={t('restaurant.form.capacity')} type="number" value={form.capacity || '4'} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              <Input label={t('restaurant.form.area')} value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={t('restaurant.form.areaPlaceholder')} />
            </>
          )}
          {tab === 'waiters' && (
            <>
              <Input label={t('restaurant.form.name')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label={t('restaurant.form.phone')} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </>
          )}
          {tab === 'taxes' && (
            <>
              <Input label={t('restaurant.form.taxName')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('restaurant.form.taxNamePlaceholder')} />
              <Input label={t('restaurant.form.code')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t('restaurant.form.codePlaceholder')} />
              <Input label={t('restaurant.form.rate')} type="number" value={form.rate || '5'} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </>
          )}
          {tab === 'settings' && (
            <>
              <Input label={t('restaurant.form.billHeader')} value={form.bill_header || ''} onChange={(e) => setForm({ ...form, bill_header: e.target.value })} />
              <Input label={t('restaurant.form.billFooter')} value={form.bill_footer || ''} onChange={(e) => setForm({ ...form, bill_footer: e.target.value })} />
              <Input label={t('restaurant.form.currencySymbol')} value={form.currency_symbol || '₹'} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
            </>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
            {t('restaurant.save')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
