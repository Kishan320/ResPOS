import axios, { type AxiosInstance } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { tStatic } from '@/i18n/i18nStore'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const { token, organizationId } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (organizationId) config.headers['X-Organization-Id'] = String(organizationId)
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname
      if (!path.startsWith('/login') && !path.startsWith('/landing') && path !== '/') {
        useAuthStore.getState().logout()
        if (!path.startsWith('/login')) window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export type PageMeta = { page: number; page_size: number; total: number; total_pages: number }
export type Page<T> = { items: T[]; meta: PageMeta }

export type User = {
  id: number
  email: string
  username: string
  full_name: string
  phone?: string | null
  role: string
  organization_id?: number | null
  is_active: boolean
  language?: string | null
}

export type Organization = {
  id: number
  name: string
  slug: string
  business_type: string
  email?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  currency_code: string
  timezone: string
  is_active: boolean
  tax_id?: string | null
  address_line1?: string | null
  address_line2?: string | null
  postal_code?: string | null
  settings?: Record<string, unknown> | null
  notes?: string | null
}

export type Category = {
  id: number
  organization_id: number
  name: string
  slug: string
  description?: string | null
  color?: string | null
  is_active: boolean
  sort_order: number
  parent_id?: number | null
}

export type Product = {
  id: number
  organization_id: number
  category_id?: number | null
  name: string
  sku?: string | null
  barcode?: string | null
  description?: string | null
  price: string | number
  cost_price?: string | number | null
  tax_rate: string | number
  unit: string
  image_url?: string | null
  is_active: boolean
  is_track_inventory: boolean
  is_sold_by_weight?: boolean
  low_stock_threshold?: string | number | null
  attributes?: Record<string, unknown> | null
  inventory?: { id: number; quantity_on_hand: string | number; reorder_level?: string | number | null } | null
}

export type Terminal = {
  id: number
  organization_id: number
  name: string
  code: string
  location?: string | null
  is_active: boolean
  cash_float: string | number
  printer_name?: string | null
  config?: Record<string, unknown> | null
}

export type Customer = {
  id: number
  organization_id: number
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export type OrderItem = {
  id: number
  product_id?: number | null
  product_name: string
  sku?: string | null
  quantity: string | number
  unit_price: string | number
  tax_rate?: string | number
  tax_amount: string | number
  discount_amount: string | number
  line_total: string | number
  notes?: string | null
}

export type Payment = {
  id: number
  method: string
  status: string
  amount: string | number
  tendered_amount?: string | number | null
  change_amount?: string | number | null
  reference?: string | null
}

export type Invoice = {
  id: number
  order_id: number
  invoice_number: string
  customer_name?: string | null
  customer_phone?: string | null
  subtotal: string | number
  tax_total: string | number
  discount_total: string | number
  grand_total: string | number
  snapshot?: Record<string, unknown> | null
  printed_count: number
}

export type Order = {
  id: number
  organization_id: number
  order_number: string
  status: string
  order_type: string
  terminal_id?: number | null
  customer_id?: number | null
  cashier_id?: number | null
  table_label?: string | null
  guest_count?: number | null
  subtotal: string | number
  tax_total: string | number
  discount_total: string | number
  grand_total: string | number
  amount_paid: string | number
  amount_due: string | number
  notes?: string | null
  items: OrderItem[]
  payments: Payment[]
  invoice?: Invoice | null
}

export function money(v: string | number | undefined | null, currency = 'AED ') {
  const n = Number(v ?? 0)
  if (Number.isNaN(n)) return `${currency}0.00`
  return `${currency}${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.detail
    if (typeof d === 'string') return translateApiMessage(d)
    if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join(', ')
    return e.message
  }
  if (e instanceof Error) {
    const known = translateApiMessage(e.message)
    return known === e.message && e.message === 'Something went wrong' ? tStatic('errors.somethingWentWrong') : known
  }
  return tStatic('errors.somethingWentWrong')
}

/** Translate the small set of stable backend messages shown to users; unknown messages pass through. */
const API_MESSAGE_KEYS: Record<string, Parameters<typeof tStatic>[0]> = {
  'Not authenticated': 'errors.notAuthenticated',
  'Invalid credentials': 'errors.invalidCredentials',
  'Account disabled': 'errors.accountDisabled',
  'Email already registered': 'errors.emailRegistered',
  'User not found': 'errors.userNotFound',
  'Access denied': 'errors.accessDenied',
  'Super admin only': 'errors.superAdminOnly',
  'Cannot create super admin': 'errors.cannotCreateSuperAdmin',
  'Something went wrong': 'errors.somethingWentWrong',
}

function translateApiMessage(message: string): string {
  const key = API_MESSAGE_KEYS[message]
  return key ? tStatic(key) : message
}

export function labelize(s: string | null | undefined) {
  if (s == null || s === '') return '-'
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
