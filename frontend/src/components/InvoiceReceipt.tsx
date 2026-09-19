import { money } from '@/lib/api'

export type InvoiceSnapshot = {
  organization?: {
    name?: string
    phone?: string | null
    email?: string | null
    address?: string | null
    address_line2?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    postal_code?: string | null
    tax_id?: string | null
    currency?: string | null
    business_type?: string | null
  }
  order_number?: string
  order_type?: string | null
  table_label?: string | null
  notes?: string | null
  cashier_name?: string | null
  served_at?: string | null
  invoice_number?: string
  customer_name?: string | null
  customer_phone?: string | null
  items?: Array<{
    name: string
    sku?: string | null
    qty: string | number
    unit_price?: string | number
    tax?: string | number
    discount?: string | number
    total: string | number
  }>
  payments?: Array<{
    method: string
    amount: string | number
    tendered?: string | number | null
    change?: string | number | null
  }>
  subtotal?: string | number
  tax_total?: string | number
  discount_total?: string | number
  grand_total?: string | number
}

type Props = {
  invoiceNumber: string
  customerName?: string | null
  customerPhone?: string | null
  subtotal: string | number
  taxTotal: string | number
  discountTotal: string | number
  grandTotal: string | number
  statusLabel?: string
  snapshot?: InvoiceSnapshot | null
  /** Fallback line items when snapshot items missing (e.g. live order) */
  fallbackItems?: Array<{
    name: string
    sku?: string | null
    qty: string | number
    unit_price?: string | number
    tax?: string | number
    total: string | number
  }>
  fallbackPayments?: Array<{
    method: string
    amount: string | number
    change?: string | number | null
  }>
  servedAt?: string | null
  orderNumber?: string | null
  orderType?: string | null
  tableLabel?: string | null
  notes?: string | null
}

function fmtDate(iso?: string | null) {
  if (!iso) return new Date().toLocaleString()
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fullAddress(org?: InvoiceSnapshot['organization']) {
  if (!org) return ''
  return [org.address, org.address_line2, org.city, org.state, org.postal_code, org.country]
    .filter(Boolean)
    .join(', ')
}

/**
 * Colorful, print-safe tax invoice used on POS sale complete + Invoices page.
 */
export default function InvoiceReceipt({
  invoiceNumber,
  customerName,
  customerPhone,
  subtotal,
  taxTotal,
  discountTotal,
  grandTotal,
  statusLabel = 'PAID',
  snapshot,
  fallbackItems,
  fallbackPayments,
  servedAt,
  orderNumber,
  orderType,
  tableLabel,
  notes,
}: Props) {
  const org = snapshot?.organization
  const items =
    snapshot?.items && snapshot.items.length > 0
      ? snapshot.items
      : (fallbackItems || []).map((i) => ({
          name: i.name,
          sku: i.sku ?? null,
          qty: i.qty,
          unit_price: i.unit_price,
          tax: i.tax,
          total: i.total,
        }))
  const payments =
    snapshot?.payments && snapshot.payments.length > 0
      ? snapshot.payments
      : fallbackPayments || []

  const currency = org?.currency ? `${org.currency} ` : 'AED '
  const m = (v: string | number | null | undefined) => money(v, currency)
  const when = fmtDate(snapshot?.served_at || servedAt)
  const addr = fullAddress(org)
  const cust = customerName || snapshot?.customer_name || 'Walk-in customer'
  const custPhone = customerPhone || snapshot?.customer_phone
  const invNo = invoiceNumber || snapshot?.invoice_number || '—'
  const ordNo = orderNumber || snapshot?.order_number
  const oType = (orderType || snapshot?.order_type || '').replace(/_/g, ' ')
  const table = tableLabel || snapshot?.table_label
  const billNotes = notes || snapshot?.notes
  const cashier = snapshot?.cashier_name

  return (
    <div className="print-area invoice-sheet rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Header band */}
      <div className="invoice-header-band bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-600 text-white px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-90">
              Tax invoice · DineFlow
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 leading-tight">
              {org?.name || 'Store invoice'}
            </div>
            {org?.business_type && (
              <div className="text-xs mt-1 capitalize opacity-90">{org.business_type.replace(/_/g, ' ')}</div>
            )}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide">
              {statusLabel}
            </div>
            <div className="mt-2 text-sm font-bold">{invNo}</div>
            <div className="text-xs opacity-90">{when}</div>
          </div>
        </div>
      </div>

      {/* Org + meta */}
      <div className="grid sm:grid-cols-2 gap-4 px-5 py-4 bg-slate-50 border-b border-slate-200 text-sm">
        <div className="space-y-1 text-slate-700">
          {addr && <div>{addr}</div>}
          {org?.phone && <div>Phone: {org.phone}</div>}
          {org?.email && <div>Email: {org.email}</div>}
          {org?.tax_id && (
            <div className="font-semibold text-teal-800">Tax / TRN: {org.tax_id}</div>
          )}
        </div>
        <div className="space-y-1 text-slate-700 sm:text-right">
          {ordNo && (
            <div>
              <span className="text-slate-500">Order #:</span> <strong>{ordNo}</strong>
            </div>
          )}
          {oType && (
            <div className="capitalize">
              <span className="text-slate-500">Service:</span> <strong>{oType}</strong>
            </div>
          )}
          {table && (
            <div>
              <span className="text-slate-500">Table / counter:</span> <strong>{table}</strong>
            </div>
          )}
          {cashier && (
            <div>
              <span className="text-slate-500">Cashier:</span> <strong>{cashier}</strong>
            </div>
          )}
          <div>
            <span className="text-slate-500">Customer:</span> <strong>{cust}</strong>
            {custPhone ? ` · ${custPhone}` : ''}
          </div>
          <div>
            <span className="text-slate-500">Service time:</span> <strong>{when}</strong>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="px-4 py-4">
        <table>
          <thead>
            <tr>
              <th className="text-left w-8">#</th>
              <th className="text-left">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit</th>
              <th className="text-right">Tax</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-6">
                  No line items on this invoice
                </td>
              </tr>
            ) : (
              items.map((i, idx) => (
                <tr key={idx}>
                  <td className="text-slate-500">{idx + 1}</td>
                  <td>
                    <div className="font-semibold text-slate-900">{i.name}</div>
                    {i.sku && <div className="text-[11px] text-slate-500">SKU: {i.sku}</div>}
                  </td>
                  <td className="text-right font-medium">{Number(i.qty)}</td>
                  <td className="text-right">{m(i.unit_price ?? 0)}</td>
                  <td className="text-right">{m(i.tax ?? 0)}</td>
                  <td className="text-right font-bold">{m(i.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals + payments */}
      <div className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700">Payments</div>
          {payments.length === 0 ? (
            <div className="text-slate-500">Recorded at sale</div>
          ) : (
            payments.map((p, idx) => (
              <div key={idx} className="flex justify-between gap-2 capitalize">
                <span>
                  {p.method}
                  {p.change != null && Number(p.change) > 0 ? ` · change ${m(p.change)}` : ''}
                </span>
                <strong>{m(p.amount)}</strong>
              </div>
            ))
          )}
          {billNotes && (
            <div className="pt-2 border-t border-slate-100 text-slate-600">
              <span className="font-semibold">Notes:</span> {billNotes}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 text-sm space-y-2">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal</span>
            <span>{m(snapshot?.subtotal ?? subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Discount</span>
            <span>- {m(snapshot?.discount_total ?? discountTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Tax / VAT</span>
            <span>{m(snapshot?.tax_total ?? taxTotal)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-teal-200 text-base font-black text-teal-900">
            <span>Grand total</span>
            <span className="text-xl">{m(snapshot?.grand_total ?? grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-900 text-slate-200 text-center text-xs">
        Thank you for your visit · Powered by DineFlow · Invoice {invNo}
      </div>
    </div>
  )
}
