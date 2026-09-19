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
import { Alert, Badge, Button, EmptyState, Input, Modal, Select, Spinner, cn } from '@/components/ui'
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
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react'
import { mediaUrl } from '@/lib/media'
import InvoiceReceipt from '@/components/InvoiceReceipt'
import { useT, useTEnum } from '@/i18n/useT'

export default function PosPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const tr = useT()
  const trEnum = useTEnum()
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
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog')
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
        setError(tr('pos.noProductForBarcode', { code }))
      }
    } catch (e) {
      setError(errMsg(e))
    }
  }

  if (!orgId) {
    return (
      <div className="premium-card p-8">
        <EmptyState
          title={tr('empty.selectOrgFirst')}
          description={tr('empty.selectOrgPosHint')}
        />
      </div>
    )
  }

  return (
    <div className="pos-shell animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-brand-600 font-semibold">{tr('pos.kicker')}</div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight">{tr('pos.liveTerminal')}</h1>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
          <Badge tone="info">{tr('pos.badge.lines', { count: totals().lines })}</Badge>
          <Badge tone="purple">{tr('pos.badge.items', { count: totals().items })}</Badge>
          <Badge tone="success">{money(t.grand)}</Badge>
        </div>
      </div>

      {/* Mobile/Tablet tab switch (< md) */}
      <div className="md:hidden flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all',
            mobileTab === 'catalog'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          )}
        >
          <LayoutGrid size={14} />
          <span>{tr('pos.tab.products')}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all relative',
            mobileTab === 'cart'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          )}
        >
          <ShoppingCart size={14} />
          <span>{tr('pos.tab.checkout')}</span>
          {t.items > 0 && (
            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {t.items}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 sm:gap-3">
        {/* Catalog */}
        <div
          className={cn(
            'pos-catalog flex flex-col rounded-2xl sm:rounded-3xl border border-ink-200/80 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden shadow-sm',
            mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
          )}
        >
          <div className="p-2.5 sm:p-3 md:p-3 border-b border-ink-100 dark:border-ink-800 space-y-2 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
                <input
                  className="field-control has-icon-left !bg-slate-50 dark:!bg-slate-950 !py-1.5 text-xs"
                  placeholder={tr('pos.searchPlaceholder')}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="relative">
                <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  className="field-control has-icon-left !bg-slate-50 dark:!bg-slate-950 !py-1.5 text-xs"
                  placeholder={tr('pos.scanPlaceholder')}
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
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full !py-1.5 text-xs">
                <option value="retail">{trEnum('orderType', 'retail', 'Retail')}</option>
                <option value="dine_in">{trEnum('orderType', 'dine_in', 'Dine in')}</option>
                <option value="takeaway">{trEnum('orderType', 'takeaway', 'Takeaway')}</option>
                <option value="delivery">{trEnum('orderType', 'delivery', 'Delivery')}</option>
                <option value="pickup">{trEnum('orderType', 'pickup', 'Pickup')}</option>
              </Select>
              <Select
                value={terminalId ?? ''}
                onChange={(e) => setTerminalId(e.target.value ? Number(e.target.value) : null)}
                className="w-full !py-1.5 text-xs"
              >
                <option value="">{tr('pos.noTerminal')}</option>
                {terminals?.items.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setCategoryId('')}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold border ${!categoryId
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-ink-200 dark:border-ink-700 text-ink-600'
                  }`}
              >
                <LayoutGrid size={11} className="inline mr-1" /> {tr('pos.allCategories')}
              </button>
              {categories?.items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(String(c.id))}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold border ${categoryId === String(c.id)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-ink-200 dark:border-ink-700 text-ink-600'
                    }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3">
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
              <EmptyState title={tr('pos.empty.products')} description={tr('pos.empty.productsHint')} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2.5">
                {products.items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="pos-product-tile text-left rounded-2xl border border-ink-200 dark:border-ink-800 p-2.5 sm:p-3 bg-gradient-to-b from-white to-ink-50 dark:from-ink-900 dark:to-ink-950 hover:shadow-lg hover:border-brand-500/40 transition-all duration-150"
                  >
                    {p.image_url ? (
                      <img
                        src={mediaUrl(p.image_url)}
                        alt={p.name}
                        className="h-28 sm:h-32 md:h-32 lg:h-36 xl:h-40 w-full rounded-xl object-cover mb-2 border border-slate-200 dark:border-slate-800"
                      />
                    ) : (
                      <div
                        className="h-28 sm:h-32 md:h-32 lg:h-36 xl:h-40 w-full rounded-xl flex items-center justify-center font-bold text-3xl mb-2 text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, #ff7a45, ${categories?.items.find((c) => c.id === p.category_id)?.color || '#faad14'
                            })`,
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="font-bold text-xs sm:text-sm md:text-sm text-slate-900 dark:text-white truncate" title={p.name}>{p.name}</div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <span className="font-black text-xs sm:text-sm md:text-base text-brand-700 dark:text-brand-300">{money(p.price)}</span>
                      {p.inventory && (
                        <span className="text-[11px] text-ink-400 font-semibold">
                          {Number(p.inventory.quantity_on_hand)} {p.unit}
                        </span>
                      )}
                    </div>
                    {p.sku && <div className="text-[10px] text-ink-400 mt-0.5 truncate">{p.sku}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mobileTab === 'catalog' && t.items > 0 && (
            <div className="md:hidden sticky bottom-2 p-2 mx-2 rounded-2xl bg-slate-950 text-white shadow-2xl flex items-center justify-between border border-white/15 z-10 shrink-0 animate-fade-up">
              <div className="flex items-center gap-2 pl-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                  {t.items}
                </span>
                <div className="text-xs font-bold text-slate-200">
                  {tr('pos.cartTotal', { amount: money(t.grand) })}
                </div>
              </div>
              <Button
                size="sm"
                className="!py-1.5 !px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => setMobileTab('cart')}
              >
                {tr('pos.checkout')} <ShoppingCart size={13} className="ml-1 inline" />
              </Button>
            </div>
          )}
        </div>

        {/* Cart panel - high contrast dark bill (pos-cart CSS forces readable colors) */}
        <div
          className={cn(
            'pos-cart flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-slate-800 bg-slate-950 text-white',
            mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
          )}
        >
          <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden !p-1 text-slate-300 hover:text-white"
                onClick={() => setMobileTab('catalog')}
                title={tr('pos.backToProducts')}
              >
                <ArrowLeft size={16} />
              </Button>
              <div>
                <div className="font-bold text-base text-white">{tr('pos.bill')}</div>
                <div className="text-[11px] pos-cart-muted capitalize">{trEnum('orderType', orderType, orderType.replace('_', ' '))} {tr('pos.checkoutSuffix')}</div>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="text-slate-200 hover:text-white" onClick={clearCart}>
              {tr('pos.clear')}
            </Button>
          </div>

          <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-2 shrink-0 border-b border-white/10">
            <input
              className="rounded-xl px-2.5 py-1.5 text-xs outline-none md:w-16"
              placeholder={tr('pos.tableLabelPlaceholder')}
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
            />
            <input
              className="rounded-xl px-2.5 py-1.5 text-xs outline-none"
              placeholder={tr('pos.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm pos-cart-muted text-center py-10">{tr('pos.cart.empty')}</p>
            ) : (
              cart.map((line) => (
                <div key={line.product_id} className="pos-cart-line rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="pos-cart-line-title text-xs font-semibold truncate" title={line.name}>
                        {line.name}
                      </div>
                      <div className="text-[11px] pos-cart-line-meta">{tr('pos.each', { price: money(line.unit_price) })}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-xs font-bold text-white">
                        {money(line.quantity * line.unit_price - line.discount_amount)}
                      </div>
                      <button
                        onClick={() => removeLine(line.product_id)}
                        className="text-slate-300 hover:text-red-400 p-0.5 transition"
                        title={tr('pos.removeLine')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="h-6 w-6 rounded-md bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition"
                        onClick={() => updateQty(line.product_id, line.quantity - 1)}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">{line.quantity}</span>
                      <button
                        className="h-6 w-6 rounded-md bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition"
                        onClick={() => updateQty(line.product_id, line.quantity + 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] pos-cart-line-meta">{tr('pos.lineDisc')}</span>
                      <input
                        type="number"
                        className="w-16 rounded-md px-1.5 py-0.5 text-xs text-right outline-none"
                        value={line.discount_amount || ''}
                        onChange={(e) => setLineDiscount(line.product_id, Number(e.target.value || 0))}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-totals p-3 border-t border-white/15 space-y-1.5 text-xs shrink-0">
            <div className="pos-cart-row flex justify-between">
              <span>{tr('pos.subtotal')}</span>
              <span className="font-semibold text-white">{money(t.subtotal)}</span>
            </div>
            <div className="pos-cart-row flex justify-between">
              <span>{tr('pos.tax')}</span>
              <span className="font-semibold text-white">{money(t.tax)}</span>
            </div>
            <div className="pos-cart-row flex items-center justify-between gap-2">
              <span>{tr('pos.billDiscount')}</span>
              <input
                type="number"
                className="w-20 rounded-lg px-2 py-1 text-right outline-none text-xs"
                value={discountTotal || ''}
                onChange={(e) => setDiscountTotal(Number(e.target.value || 0))}
              />
            </div>
            <div className="flex justify-between text-base font-black pt-1 text-white">
              <span>{tr('pos.total')}</span>
              <span className="pos-cart-total-value">{money(t.grand)}</span>
            </div>
            <Button
              className="w-full mt-1.5"
              size="lg"
              disabled={!cart.length}
              onClick={() => {
                setError('')
                setTendered(String(t.grand))
                setPayOpen(true)
              }}
            >
              {tr('pos.charge', { amount: money(t.grand) })}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={tr('pos.collectPayment')} subtitle={tr('pos.collectPaymentSubtitle')} wide>
        <div className="space-y-5">
          <div className="text-center py-3 rounded-3xl bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-950 dark:to-violet-950 border border-brand-100 dark:border-brand-900">
            <div className="text-sm text-ink-500">{tr('pos.amountDue')}</div>
            <div className="text-4xl font-black text-brand-700 dark:text-brand-300 mt-1">{money(t.grand)}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                ['cash', Banknote],
                ['card', CreditCard],
                ['upi', Smartphone],
                ['wallet', CreditCard],
              ] as const
            ).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-sm font-semibold transition ${method === key
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 shadow-md'
                  : 'border-ink-200 dark:border-ink-700'
                  }`}
              >
                <Icon size={18} />
                {trEnum('paymentMethods', key, key)}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={tr('pos.cashTendered')} type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} />
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 flex flex-col justify-center">
                <div className="text-xs text-emerald-700 dark:text-emerald-300">{tr('pos.changeToReturn')}</div>
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
            {tr('pos.splitCheckbox')}
          </label>
          {splitSecond && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Select label={tr('pos.secondMethod')} value={secondMethod} onChange={(e) => setSecondMethod(e.target.value as 'card' | 'upi')}>
                <option value="card">{trEnum('paymentMethods', 'card', 'Card')}</option>
                <option value="upi">{trEnum('paymentMethods', 'upi', 'UPI')}</option>
              </Select>
              <Input
                label={tr('pos.secondAmount')}
                type="number"
                value={secondAmount}
                onChange={(e) => setSecondAmount(e.target.value)}
                hint={tr('pos.primaryTakesRest', { method: trEnum('paymentMethods', method, method) })}
              />
            </div>
          )}

          {error && <Alert tone="danger">{error}</Alert>}

          <Button className="w-full" size="xl" disabled={checkoutMut.isPending} onClick={() => checkoutMut.mutate()}>
            {checkoutMut.isPending ? tr('pos.processing') : tr('pos.completeSale')}
          </Button>
        </div>
      </Modal>

      {/* Receipt / tax invoice */}
      <Modal open={!!lastInvoice} onClose={() => setLastInvoice(null)} title={tr('pos.saleComplete')} wide>
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
              statusLabel={`${tr('receipt.paid')} · ${trEnum('orderStatus', lastInvoice.status, lastInvoice.status)}`}
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
              <Button variant="secondary" onClick={() => window.print()}>{tr('pos.printInvoice')}</Button>
              <Button onClick={() => setLastInvoice(null)}>{tr('pos.newSale')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
