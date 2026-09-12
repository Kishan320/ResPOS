import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  errMsg,
  money,
  type Category,
  type Order,
  type Page,
  type Product,
  type Terminal,
} from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { usePosStore } from '@/store/posStore'
import { Alert, Badge, Button, EmptyState, Input, Modal, Select, Spinner } from '@/components/ui'
import {
  Minus,
  Plus,
  Search,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  LayoutGrid,
  Keyboard,
} from 'lucide-react'
import { mediaUrl } from '@/lib/media'
import InvoiceReceipt from '@/components/InvoiceReceipt'

export default function PosPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [payOpen, setPayOpen] = useState(false)
  const [method, setMethod] = useState<'cash' | 'card' | 'upi' | 'wallet'>('cash')
  const [tendered, setTendered] = useState('')
  const [splitSecond, setSplitSecond] = useState(false)
  const [secondMethod, setSecondMethod] = useState<'card' | 'upi'>('upi')
  const [secondAmount, setSecondAmount] = useState('')
  const [error, setError] = useState('')
  const [lastInvoice, setLastInvoice] = useState<Order | null>(null)
  const [barcode, setBarcode] = useState('')
  const qc = useQueryClient()

  const cart = usePosStore((s) => s.cart)
  const addProduct = usePosStore((s) => s.addProduct)
  const updateQty = usePosStore((s) => s.updateQty)
  const removeLine = usePosStore((s) => s.removeLine)
  const clearCart = usePosStore((s) => s.clearCart)
  const totals = usePosStore((s) => s.totals)
  const terminalId = usePosStore((s) => s.terminalId)
  const setTerminalId = usePosStore((s) => s.setTerminalId)
  const orderType = usePosStore((s) => s.orderType)
  const setOrderType = usePosStore((s) => s.setOrderType)
  const discountTotal = usePosStore((s) => s.discountTotal)
  const setDiscountTotal = usePosStore((s) => s.setDiscountTotal)
  const tableLabel = usePosStore((s) => s.tableLabel)
  const setTableLabel = usePosStore((s) => s.setTableLabel)
  const notes = usePosStore((s) => s.notes)
  const setNotes = usePosStore((s) => s.setNotes)
  const setLineDiscount = usePosStore((s) => s.setLineDiscount)

  const t = totals()

  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products', orgId, q, categoryId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await api.get<Page<Product>>('/catalog/products', {
          params: {
            q: q || undefined,
            category_id: categoryId || undefined,
            page_size: 100,
            is_active: true,
          },
        })
      ).data,
  })

  const { data: categories } = useQuery({
    queryKey: ['pos-categories', orgId],
    enabled: !!orgId,
    queryFn: async () =>
      (await api.get<Page<Category>>('/catalog/categories', { params: { page_size: 200 } })).data,
  })

  const { data: terminals } = useQuery({
    queryKey: ['terminals', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Page<Terminal>>('/terminals', { params: { page_size: 50 } })).data,
  })

  const checkoutMut = useMutation({
    mutationFn: async () => {
      const orderPayload = {
        order_type: orderType,
        terminal_id: terminalId,
        discount_total: discountTotal,
        table_label: tableLabel || null,
        notes: notes || null,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount_amount: c.discount_amount,
        })),
      }
      const { data: order } = await api.post<Order>('/orders', orderPayload)
      const payAmount = Number(order.grand_total)

      let payments: Array<Record<string, unknown>> = []
      if (splitSecond && Number(secondAmount) > 0 && Number(secondAmount) < payAmount) {
        const second = Number(secondAmount)
        const first = Math.round((payAmount - second) * 100) / 100
        payments = [
          {
            method,
            amount: first,
            tendered_amount: method === 'cash' ? Number(tendered || first) : null,
            reference: method !== 'cash' ? `${method.toUpperCase()}-${Date.now()}` : null,
          },
          {
            method: secondMethod,
            amount: second,
            reference: `${secondMethod.toUpperCase()}-${Date.now()}`,
          },
        ]
      } else {
        const tenderedAmt = method === 'cash' ? Number(tendered || payAmount) : payAmount
        payments = [
          {
            method,
            amount: payAmount,
            tendered_amount: method === 'cash' ? tenderedAmt : null,
            reference: method !== 'cash' ? `${method.toUpperCase()}-${Date.now()}` : null,
          },
        ]
      }

      const { data: completed } = await api.post<Order>(`/orders/${order.id}/checkout`, {
        print_invoice: true,
        payments,
      })
      return completed
    },
    onSuccess: (order) => {
      clearCart()
      setPayOpen(false)
      setTendered('')
      setSplitSecond(false)
      setSecondAmount('')
      setLastInvoice(order)
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['pos-products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => setError(errMsg(e)),
  })

  const change = useMemo(() => {
    if (method !== 'cash') return 0
    const firstAmt = splitSecond && Number(secondAmount) > 0 ? t.grand - Number(secondAmount) : t.grand
    const tnd = Number(tendered || 0)
    return Math.max(0, Math.round((tnd - firstAmt) * 100) / 100)
  }, [method, tendered, t.grand, splitSecond, secondAmount])

  async function scanBarcode(code: string) {
    if (!code.trim()) return
    try {
      const { data } = await api.get<Page<Product>>('/catalog/products', {
        params: { barcode: code.trim(), page_size: 1, is_active: true },
      })
      if (data.items[0]) {
        addProduct(data.items[0])
        setBarcode('')
      } else {
        setError(`No product for barcode ${code}`)
      }
    } catch (e) {
      setError(errMsg(e))
    }
  }

  if (!orgId) {
    return (
      <div className="premium-card p-8">
        <EmptyState
          title="Select an organization first"
          description="Super admin: open Organizations and set an active tenant before using POS."
        />
      </div>
    )
  }

  return (
    <div className="pos-shell animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-brand-600 font-semibold">Point of sale</div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight">Live terminal</h1>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
          <Badge tone="info">{t.lines} lines</Badge>
          <Badge tone="purple">{t.items} items</Badge>
          <Badge tone="success">{money(t.grand)}</Badge>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col xl:flex-row gap-3">
        {/* Catalog */}
        <div className="pos-catalog flex flex-col rounded-2xl sm:rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden shadow-sm min-h-[42dvh] xl:min-h-0">
          <div className="p-2.5 sm:p-4 border-b border-ink-100 dark:border-ink-800 space-y-2.5 sm:space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[min(100%,140px)]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
                <input
                  className="field-control has-icon-left !bg-slate-50 dark:!bg-slate-950"
                  placeholder="Search name, SKU…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="relative min-w-[min(100%,140px)] flex-1 sm:flex-none">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  className="field-control has-icon-left !bg-slate-50 dark:!bg-slate-950"
                  placeholder="Scan barcode + Enter"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      scanBarcode(barcode)
                    }
                  }}
                />
              </div>
              <Select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full sm:w-36 py-2.5">
                <option value="retail">Retail</option>
                <option value="dine_in">Dine in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
              </Select>
              <Select
                value={terminalId ?? ''}
                onChange={(e) => setTerminalId(e.target.value ? Number(e.target.value) : null)}
                className="w-full sm:w-40 py-2.5"
              >
                <option value="">No terminal</option>
                {terminals?.items.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoryId('')}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  !categoryId
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-ink-200 dark:border-ink-700 text-ink-600'
                }`}
              >
                <LayoutGrid size={12} className="inline mr-1" /> All
              </button>
              {categories?.items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(String(c.id))}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                    categoryId === String(c.id)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-ink-200 dark:border-ink-700 text-ink-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {error && !payOpen && (
              <div className="mb-3">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-8 w-8" />
              </div>
            ) : !products?.items?.length ? (
              <EmptyState title="No products" description="Add products or clear filters." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2.5">
                {products.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="pos-product-tile text-left rounded-2xl border border-ink-200 dark:border-ink-800 p-3.5 bg-gradient-to-b from-white to-ink-50 dark:from-ink-900 dark:to-ink-950"
                  >
                    {p.image_url ? (
                      <img
                        src={mediaUrl(p.image_url)}
                        alt=""
                        className="h-14 w-full rounded-xl object-cover mb-2.5 border border-slate-200"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm mb-2.5 text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, #ff7a45, ${
                            categories?.items.find((c) => c.id === p.category_id)?.color || '#faad14'
                          })`,
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] leading-snug">{p.name}</div>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="font-black text-brand-700 dark:text-brand-300">{money(p.price)}</span>
                      {p.inventory && (
                        <span className="text-[10px] text-ink-400 font-medium">
                          {Number(p.inventory.quantity_on_hand)} {p.unit}
                        </span>
                      )}
                    </div>
                    {p.sku && <div className="text-[10px] text-ink-400 mt-1 truncate">{p.sku}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel - high contrast dark bill (pos-cart CSS forces readable colors) */}
        <div className="pos-cart flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-slate-800 bg-slate-950 text-white">
          <div className="px-5 py-4 border-b border-white/15 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-white">Bill</div>
              <div className="text-xs pos-cart-muted capitalize">{orderType.replace('_', ' ')} checkout</div>
            </div>
            <Button size="sm" variant="ghost" className="text-slate-200 hover:text-white" onClick={clearCart}>
              Clear
            </Button>
          </div>

          <div className="px-4 pt-3 grid grid-cols-2 gap-2">
            <input
              className="rounded-xl px-3 py-2 text-xs outline-none"
              placeholder="Table / counter label"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
            />
            <input
              className="rounded-xl px-3 py-2 text-xs outline-none"
              placeholder="Order notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm pos-cart-muted text-center py-12">Tap products or scan barcode</p>
            ) : (
              cart.map((line) => (
                <div key={line.product_id} className="pos-cart-line rounded-2xl p-3">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="pos-cart-line-title text-sm truncate">{line.name}</div>
                      <div className="text-[11px] pos-cart-line-meta">{money(line.unit_price)} each</div>
                    </div>
                    <button onClick={() => removeLine(line.product_id)} className="text-slate-300 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        className="h-8 w-8 rounded-xl bg-white/15 text-white flex items-center justify-center"
                        onClick={() => updateQty(line.product_id, line.quantity - 1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">{line.quantity}</span>
                      <button
                        className="h-8 w-8 rounded-xl bg-white/15 text-white flex items-center justify-center"
                        onClick={() => updateQty(line.product_id, line.quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {money(line.quantity * line.unit_price - line.discount_amount)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] pos-cart-line-meta">Line disc.</span>
                    <input
                      type="number"
                      className="w-20 rounded-lg px-2 py-1 text-xs text-right outline-none"
                      value={line.discount_amount || ''}
                      onChange={(e) => setLineDiscount(line.product_id, Number(e.target.value || 0))}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-totals p-4 border-t border-white/15 space-y-2 text-sm">
            <div className="pos-cart-row flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-white">{money(t.subtotal)}</span>
            </div>
            <div className="pos-cart-row flex justify-between">
              <span>Tax</span>
              <span className="font-semibold text-white">{money(t.tax)}</span>
            </div>
            <div className="pos-cart-row flex items-center justify-between gap-3">
              <span>Bill discount</span>
              <input
                type="number"
                className="w-24 rounded-xl px-2 py-1.5 text-right outline-none"
                value={discountTotal || ''}
                onChange={(e) => setDiscountTotal(Number(e.target.value || 0))}
              />
            </div>
            <div className="flex justify-between text-xl font-black pt-2 text-white">
              <span>Total</span>
              <span className="pos-cart-total-value">{money(t.grand)}</span>
            </div>
            <Button
              className="w-full mt-2"
              size="xl"
              disabled={!cart.length}
              onClick={() => {
                setError('')
                setTendered(String(t.grand))
                setPayOpen(true)
              }}
            >
              Charge {money(t.grand)}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Collect payment" subtitle="Cash, card, UPI or split tender" wide>
        <div className="space-y-5">
          <div className="text-center py-3 rounded-3xl bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-950 dark:to-violet-950 border border-brand-100 dark:border-brand-900">
            <div className="text-sm text-ink-500">Amount due</div>
            <div className="text-4xl font-black text-brand-700 dark:text-brand-300 mt-1">{money(t.grand)}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                ['cash', 'Cash', Banknote],
                ['card', 'Card', CreditCard],
                ['upi', 'UPI', Smartphone],
                ['wallet', 'Wallet', CreditCard],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-sm font-semibold transition ${
                  method === key
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 shadow-md'
                    : 'border-ink-200 dark:border-ink-700'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Cash tendered" type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} />
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 flex flex-col justify-center">
                <div className="text-xs text-emerald-700 dark:text-emerald-300">Change to return</div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{money(change)}</div>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                {[t.grand, Math.ceil(t.grand / 100) * 100, Math.ceil(t.grand / 500) * 500].map((v) => (
                  <Button key={v} size="sm" variant="secondary" onClick={() => setTendered(String(v))}>
                    {money(v)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={splitSecond} onChange={(e) => setSplitSecond(e.target.checked)} />
            Split with second payment method
          </label>
          {splitSecond && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Select label="Second method" value={secondMethod} onChange={(e) => setSecondMethod(e.target.value as 'card' | 'upi')}>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </Select>
              <Input
                label="Second amount"
                type="number"
                value={secondAmount}
                onChange={(e) => setSecondAmount(e.target.value)}
                hint={`Primary (${method}) will take the rest`}
              />
            </div>
          )}

          {error && <Alert tone="danger">{error}</Alert>}

          <Button className="w-full" size="xl" disabled={checkoutMut.isPending} onClick={() => checkoutMut.mutate()}>
            {checkoutMut.isPending ? 'Processing…' : 'Complete sale & print bill'}
          </Button>
        </div>
      </Modal>

      {/* Receipt / tax invoice */}
      <Modal open={!!lastInvoice} onClose={() => setLastInvoice(null)} title="Sale complete" wide>
        {lastInvoice && (
          <div className="space-y-4">
            <InvoiceReceipt
              invoiceNumber={lastInvoice.invoice?.invoice_number || lastInvoice.order_number}
              customerName={lastInvoice.invoice?.customer_name}
              customerPhone={lastInvoice.invoice?.customer_phone}
              subtotal={lastInvoice.subtotal}
              taxTotal={lastInvoice.tax_total}
              discountTotal={lastInvoice.discount_total}
              grandTotal={lastInvoice.grand_total}
              statusLabel={`PAID · ${lastInvoice.status}`}
              snapshot={lastInvoice.invoice?.snapshot as never}
              fallbackItems={lastInvoice.items.map((i) => ({
                name: i.product_name,
                sku: i.sku,
                qty: i.quantity,
                unit_price: i.unit_price,
                tax: i.tax_amount,
                total: i.line_total,
              }))}
              fallbackPayments={lastInvoice.payments.map((p) => ({
                method: p.method,
                amount: p.amount,
                change: p.change_amount,
              }))}
              orderNumber={lastInvoice.order_number}
              orderType={lastInvoice.order_type}
              tableLabel={lastInvoice.table_label}
              notes={lastInvoice.notes}
            />
            <div className="no-print flex gap-2 justify-end pt-1">
              <Button variant="secondary" onClick={() => window.print()}>Print invoice</Button>
              <Button onClick={() => setLastInvoice(null)}>New sale</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
