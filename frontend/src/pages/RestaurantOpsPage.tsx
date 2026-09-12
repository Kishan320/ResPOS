import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Page } from '@/lib/api'
import { Alert, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Plus } from 'lucide-react'

type Waiter = { id: number; name: string; code?: string; phone?: string; is_active: boolean }
type Table = { id: number; name: string; code?: string; capacity: number; area?: string; is_active: boolean; is_occupied: boolean }
type Tax = { id: number; name: string; code: string; rate: string | number; is_default: boolean; is_active: boolean }

export default function RestaurantOpsPage() {
  const orgId = useAuthStore((s) => s.organizationId)
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
    return <Card><EmptyState title="Select an organization first" description="Restaurant module is tenant-scoped." /></Card>
  }

  const tabs = [
    ['tables', 'Tables'],
    ['waiters', 'Waiters'],
    ['taxes', 'Taxes'],
    ['settings', 'Bill settings'],
  ] as const

  return (
    <div>
      <PageHeader
        breadcrumb="Restaurant"
        title="Floor & settings"
        subtitle="Tables, waiters, taxes and POS bill configuration - from the restaurant module PDF."
        actions={
          tab !== 'settings' ? (
            <Button onClick={() => { setError(''); setForm({}); setOpen(true) }}>
              <Plus size={16} /> Add {tab.slice(0, -1)}
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
              Edit settings
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
          <Card><EmptyState title="No tables" description="Add dining tables for dine-in POS." /></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tables.data.items.map((t) => (
              <div key={t.id} className="premium-card p-4">
                <div className="flex justify-between items-start">
                  <div className="font-black text-lg text-slate-900 dark:text-white">{t.name}</div>
                  <Badge tone={t.is_occupied ? 'warning' : 'success'}>{t.is_occupied ? 'Occupied' : 'Free'}</Badge>
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">
                  Capacity {t.capacity} · {t.area || 'Main floor'}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">{t.code}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'waiters' && (
        waiters.isLoading ? <Spinner /> : !waiters.data?.items?.length ? (
          <Card><EmptyState title="No waiters" /></Card>
        ) : (
          <div className="premium-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {waiters.data.items.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-bold">{w.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                    <td className="px-4 py-3">{w.phone || '-'}</td>
                    <td className="px-4 py-3"><Badge tone={w.is_active ? 'success' : 'neutral'}>{w.is_active ? 'Active' : 'Off'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'taxes' && (
        taxes.isLoading ? <Spinner /> : !taxes.data?.items?.length ? (
          <Card><EmptyState title="No tax rates" description="Add GST/VAT rates used on menu items." /></Card>
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
          <Card title="Restaurant / POS bill settings" subtitle={settings.data?.name}>
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

      <Modal open={open} onClose={() => setOpen(false)} title={tab === 'settings' ? 'Edit bill settings' : `Add ${tab.slice(0, -1)}`}>
        <div className="space-y-3">
          {tab === 'tables' && (
            <>
              <Input label="Table name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="T1 / Table 5" />
              <Input label="Capacity" type="number" value={form.capacity || '4'} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              <Input label="Area" value={form.area || ''} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="AC Hall" />
            </>
          )}
          {tab === 'waiters' && (
            <>
              <Input label="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </>
          )}
          {tab === 'taxes' && (
            <>
              <Input label="Tax name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="GST 5%" />
              <Input label="Code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="GST5" />
              <Input label="Rate %" type="number" value={form.rate || '5'} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </>
          )}
          {tab === 'settings' && (
            <>
              <Input label="Bill header" value={form.bill_header || ''} onChange={(e) => setForm({ ...form, bill_header: e.target.value })} />
              <Input label="Bill footer" value={form.bill_footer || ''} onChange={(e) => setForm({ ...form, bill_footer: e.target.value })} />
              <Input label="Currency symbol" value={form.currency_symbol || '₹'} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
            </>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}
