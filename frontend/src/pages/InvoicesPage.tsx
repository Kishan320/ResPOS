import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, money, type Invoice, type Page } from '@/lib/api'
import { Button, Card, EmptyState, Modal, PageHeader, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Printer, Search } from 'lucide-react'
import { useT } from '@/i18n/useT'
import InvoiceReceipt, { type InvoiceSnapshot } from '@/components/InvoiceReceipt'

export default function InvoicesPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', orgId, q],
    enabled: !!orgId,
    queryFn: async () =>
      (await api.get<Page<Invoice>>('/invoices', { params: { page_size: 100, q: q || undefined } })).data,
  })

  const printMut = useMutation({
    mutationFn: async (id: number) => (await api.post<Invoice>(`/invoices/${id}/print`)).data,
    onSuccess: (inv) => {
      setSelected(inv)
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} /></Card>
  }

  const snap = (selected?.snapshot || null) as InvoiceSnapshot | null

  return (
    <div>
      <PageHeader
        breadcrumb={t('invoices.breadcrumb')}
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
      />

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
        <input
          className="w-full rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          placeholder={t('invoices.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card><EmptyState title={t('invoices.empty')} description={t('invoices.emptyHint')} /></Card>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full text-sm table-row-hover">
              <thead className="bg-ink-50 dark:bg-ink-950 text-ink-500">
                <tr>
                  <th className="text-left px-4 py-3">{t('invoices.table.invoiceNo')}</th>
                  <th className="text-left px-4 py-3">{t('invoices.table.customer')}</th>
                  <th className="text-right px-4 py-3">{t('invoices.table.subtotal')}</th>
                  <th className="text-right px-4 py-3">{t('invoices.table.tax')}</th>
                  <th className="text-right px-4 py-3">{t('invoices.table.total')}</th>
                  <th className="text-right px-4 py-3">{t('invoices.table.prints')}</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inv) => (
                  <tr key={inv.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="px-4 py-3 font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.customer_name || t('invoices.walkIn')}</td>
                    <td className="px-4 py-3 text-right">{money(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-right">{money(inv.tax_total)}</td>
                    <td className="px-4 py-3 text-right font-bold">{money(inv.grand_total)}</td>
                    <td className="px-4 py-3 text-right">{inv.printed_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelected(inv)
                          printMut.mutate(inv.id)
                        }}
                      >
                        <Printer size={14} /> {t('invoices.print')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={t('invoices.taxInvoiceTitle')} wide>
        {selected && (
          <div className="space-y-4">
            <InvoiceReceipt
              invoiceNumber={selected.invoice_number}
              customerName={selected.customer_name}
              customerPhone={selected.customer_phone}
              subtotal={selected.subtotal}
              taxTotal={selected.tax_total}
              discountTotal={selected.discount_total}
              grandTotal={selected.grand_total}
              statusLabel={`${t('receipt.paid')} · ${t('orderStatus.completed')}`}
              snapshot={snap}
              orderNumber={snap?.order_number}
              orderType={snap?.order_type}
              tableLabel={snap?.table_label}
              notes={snap?.notes}
              servedAt={snap?.served_at}
            />
            <div className="no-print flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => window.print()}>{t('invoices.printInvoice')}</Button>
              <Button onClick={() => setSelected(null)}>{t('invoices.close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
