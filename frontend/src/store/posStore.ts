import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/lib/api'

export type CartLine = {
  product_id: number
  name: string
  unit_price: number
  tax_rate: number
  quantity: number
  discount_amount: number
  sku?: string | null
}

type PosState = {
  cart: CartLine[]
  terminalId: number | null
  orderType: string
  discountTotal: number
  customerId: number | null
  tableLabel: string
  notes: string
  setTerminalId: (id: number | null) => void
  setOrderType: (t: string) => void
  setDiscountTotal: (n: number) => void
  setCustomerId: (id: number | null) => void
  setTableLabel: (v: string) => void
  setNotes: (v: string) => void
  addProduct: (p: Product, qty?: number) => void
  updateQty: (productId: number, qty: number) => void
  setLineDiscount: (productId: number, amount: number) => void
  removeLine: (productId: number) => void
  clearCart: () => void
  totals: () => { subtotal: number; tax: number; discount: number; grand: number; lines: number; items: number }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      terminalId: null,
      orderType: 'retail',
      discountTotal: 0,
      customerId: null,
      tableLabel: '',
      notes: '',
      setTerminalId: (id) => set({ terminalId: id }),
      setOrderType: (t) => set({ orderType: t }),
      setDiscountTotal: (n) => set({ discountTotal: Math.max(0, n) }),
      setCustomerId: (id) => set({ customerId: id }),
      setTableLabel: (tableLabel) => set({ tableLabel }),
      setNotes: (notes) => set({ notes }),
      addProduct: (p, qty = 1) => {
        const cart = [...get().cart]
        const idx = cart.findIndex((c) => c.product_id === p.id)
        if (idx >= 0) {
          cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + qty }
        } else {
          cart.push({
            product_id: p.id,
            name: p.name,
            unit_price: Number(p.price),
            tax_rate: Number(p.tax_rate),
            quantity: qty,
            discount_amount: 0,
            sku: p.sku,
          })
        }
        set({ cart })
      },
      updateQty: (productId, qty) => {
        if (qty <= 0) {
          set({ cart: get().cart.filter((c) => c.product_id !== productId) })
          return
        }
        set({
          cart: get().cart.map((c) => (c.product_id === productId ? { ...c, quantity: qty } : c)),
        })
      },
      setLineDiscount: (productId, amount) => {
        set({
          cart: get().cart.map((c) =>
            c.product_id === productId ? { ...c, discount_amount: Math.max(0, amount) } : c
          ),
        })
      },
      removeLine: (productId) => set({ cart: get().cart.filter((c) => c.product_id !== productId) }),
      clearCart: () =>
        set({ cart: [], discountTotal: 0, customerId: null, tableLabel: '', notes: '' }),
      totals: () => {
        const { cart, discountTotal } = get()
        let subtotal = 0
        let tax = 0
        let items = 0
        for (const line of cart) {
          const base = line.quantity * line.unit_price - line.discount_amount
          const safeBase = Math.max(0, base)
          tax += safeBase * (line.tax_rate / 100)
          subtotal += safeBase
          items += line.quantity
        }
        const grand = Math.max(0, subtotal + tax - discountTotal)
        return {
          subtotal: round2(subtotal),
          tax: round2(tax),
          discount: round2(discountTotal),
          grand: round2(grand),
          lines: cart.length,
          items: round2(items),
        }
      },
    }),
    { name: 'pos-cart-v2', partialize: (s) => ({ terminalId: s.terminalId, orderType: s.orderType }) }
  )
)
