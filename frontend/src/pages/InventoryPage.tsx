import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Page, type Product } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Warehouse } from 'lucide-react'
import { useT, useTEnum } from '@/i18n/useT'

export default function InventoryPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const tEnum = useTEnum()
  const [selected, setSelected] = useState<Product | null>(null)
  const [delta, setDelta] = useState('10')
  const [movement, setMovement] = useState('adjustment')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products-inv', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Page<Product>>('/catalog/products', { params: { page_size: 200 } })).data,
  })

  const rows = useMemo(() => {
    const items = data?.items || []
    return items.filter((p) => {
      const qty = Number(p.inventory?.quantity_on_hand ?? 0)
      if (filter === 'out') return qty <= 0
      if (filter === 'low') {
        const thr = p.low_stock_threshold != null ? Number(p.low_stock_threshold) : 10
        return qty > 0 && qty <= thr
      }
      return true
    })
  }, [data, filter])

  const adjustMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/catalog/inventory/adjust', {
          product_id: selected!.id,
          quantity_delta: Number(delta),
          notes: notes || t('inventory.notesDefault'),
          movement_type: movement,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products-inv'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected(null)
      setDelta('10')
      setNotes('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} /></Card>
  }

  return (
    <div>
      <PageHeader
        breadcrumb={t('inventory.breadcrumb')}
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'low', 'out'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-semibold border ${
              filter === f ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200 dark:border-ink-700'
            }`}
          >
            {f === 'all' ? t('inventory.filter.all') : f === 'low' ? t('inventory.filter.low') : t('inventory.filter.out')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !rows.length ? (
        <Card>
          <EmptyState icon={<Warehouse size={24} />} title={t('inventory.empty')} />
        </Card>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full text-sm table-row-hover">
              <thead className="bg-ink-50 dark:bg-ink-950 text-ink-500">
                <tr>
                  <th className="text-left px-4 py-3">{t('inventory.table.product')}</th>
                  <th className="text-left px-4 py-3">{t('inventory.table.sku')}</th>
                  <th className="text-right px-4 py-3">{t('inventory.table.onHand')}</th>
                  <th className="text-right px-4 py-3">{t('inventory.table.threshold')}</th>
                  <th className="text-left px-4 py-3">{t('inventory.table.health')}</th>
                  <th className="text-right px-4 py-3">{t('inventory.table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const qty = Number(p.inventory?.quantity_on_hand ?? 0)
                  const thr = p.low_stock_threshold != null ? Number(p.low_stock_threshold) : null
                  const health = qty <= 0 ? 'out' : thr != null && qty <= thr ? 'low' : 'ok'
                  return (
                    <tr key={p.id} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-ink-500">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{qty} <span className="text-ink-400 font-normal">{p.unit}</span></td>
                      <td className="px-4 py-3 text-right text-ink-500">{thr ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge tone={health === 'ok' ? 'success' : health === 'low' ? 'warning' : 'danger'}>
                          {health === 'ok' ? t('inventory.health.ok') : health === 'low' ? t('inventory.health.low') : t('inventory.health.out')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(p); setError('') }}>{t('inventory.adjust')}</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('inventory.adjustTitle', { name: selected?.name || '' })} subtitle={t('inventory.adjustSubtitle')}>
        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            {t('inventory.current')} <span className="font-bold text-ink-800 dark:text-ink-100">{Number(selected?.inventory?.quantity_on_hand ?? 0)} {selected?.unit}</span>
          </p>
          <Input label={t('inventory.deltaLabel')} type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <Select label={t('inventory.movementLabel')} value={movement} onChange={(e) => setMovement(e.target.value)}>
            <option value="adjustment">{tEnum('movementTypes', 'adjustment', 'Adjustment')}</option>
            <option value="purchase">{tEnum('movementTypes', 'purchase', 'Purchase / restock')}</option>
            <option value="return">{tEnum('movementTypes', 'return', 'Return')}</option>
            <option value="waste">{tEnum('movementTypes', 'waste', 'Waste')}</option>
            <option value="transfer">{tEnum('movementTypes', 'transfer', 'Transfer')}</option>
            <option value="opening">{tEnum('movementTypes', 'opening', 'Opening balance')}</option>
          </Select>
          <Input label={t('inventory.notesLabel')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDelta(String(-Math.abs(Number(delta) || 1)))}>{t('inventory.remove')}</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setDelta(String(Math.abs(Number(delta) || 1)))}>{t('inventory.add')}</Button>
          </div>
          <Button className="w-full" disabled={adjustMut.isPending} onClick={() => { setError(''); adjustMut.mutate() }}>{t('inventory.apply')}</Button>
        </div>
      </Modal>
    </div>
  )
}
