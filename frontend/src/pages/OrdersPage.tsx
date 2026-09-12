import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, labelize, money, type Order, type Page } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

const tone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  completed: 'success',
  open: 'info',
  held: 'warning',
  cancelled: 'danger',
  refunded: 'neutral',
  draft: 'neutral',
}

export default function OrdersPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', orgId, status],
    enabled: !!orgId,
    queryFn: async () =>
      (await api.get<Page<Order>>('/orders', { params: { page_size: 100, status: status || undefined } })).data,
  })

  const holdMut = useMutation({
    mutationFn: async (id: number) => (await api.post<Order>(`/orders/${id}/hold`)).data,
    onSuccess: (o) => { qc.invalidateQueries({ queryKey: ['orders'] }); setSelected(o) },
    onError: (e) => setError(errMsg(e)),
  })

  const cancelMut = useMutation({
    mutationFn: async (id: number) => (await api.post<Order>(`/orders/${id}/cancel`)).data,
    onSuccess: (o) => { qc.invalidateQueries({ queryKey: ['orders'] }); setSelected(o) },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title="Select an organization first" /></Card>
  }

  return (
    <div>
      <PageHeader breadcrumb="Sales" title="Orders" subtitle="All POS and sales orders with deep line-item detail." />

      <div className="mb-5 max-w-xs">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Filter status">
          <option value="">All statuses</option>
          {['open', 'held', 'completed', 'cancelled', 'refunded', 'draft'].map((s) => (
            <option key={s} value={s}>{labelize(s)}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card><EmptyState title="No orders" description="Complete a sale from the POS terminal." /></Card>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full text-sm table-row-hover">
              <thead className="bg-ink-50 dark:bg-ink-950 text-ink-500">
                <tr>
                  <th className="text-left px-4 py-3">Order #</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Paid</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3 capitalize">{labelize(o.order_type)}</td>
                    <td className="px-4 py-3"><Badge tone={tone[o.status] || 'neutral'}>{o.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right font-bold">{money(o.grand_total)}</td>
                    <td className="px-4 py-3 text-right">{money(o.amount_paid)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        setError('')
                        const { data: full } = await api.get<Order>(`/orders/${o.id}`)
                        setSelected(full)
                      }}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.order_number || 'Order'} subtitle="Full order detail" wide>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={tone[selected.status] || 'neutral'}>{selected.status}</Badge>
              <Badge tone="purple">{labelize(selected.order_type)}</Badge>
              {selected.table_label && <Badge>{selected.table_label}</Badge>}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500 border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((i) => (
                  <tr key={i.id} className="border-b border-ink-50 dark:border-ink-800">
                    <td className="py-2 font-medium">{i.product_name}</td>
                    <td className="text-right">{Number(i.quantity)}</td>
                    <td className="text-right">{money(i.unit_price)}</td>
                    <td className="text-right font-semibold">{money(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-ink-500">Subtotal</div><div className="text-right">{money(selected.subtotal)}</div>
              <div className="text-ink-500">Tax</div><div className="text-right">{money(selected.tax_total)}</div>
              <div className="text-ink-500">Discount</div><div className="text-right">{money(selected.discount_total)}</div>
              <div className="font-bold">Grand total</div><div className="text-right font-black">{money(selected.grand_total)}</div>
            </div>
            {selected.payments?.length > 0 && (
              <div className="rounded-2xl bg-ink-50 dark:bg-ink-950 p-4 text-sm space-y-1">
                <div className="font-semibold mb-2">Payments</div>
                {selected.payments.map((p) => (
                  <div key={p.id} className="flex justify-between capitalize">
                    <span>{p.method} · {p.status}</span>
                    <span>{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              {['open', 'draft'].includes(selected.status) && (
                <Button variant="secondary" disabled={holdMut.isPending} onClick={() => holdMut.mutate(selected.id)}>Hold</Button>
              )}
              {!['completed', 'cancelled'].includes(selected.status) && (
                <Button variant="danger" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate(selected.id)}>Cancel order</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
