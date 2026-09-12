/**
 * DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage
 * Manage coupons, seasonal offers, item/category discounts; super admin org offers.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

type DiscountPromotionRule = {
  id: number
  promotion_display_name: string
  coupon_code_normalized?: string | null
  discount_scope_type: string
  discount_value_type: string
  discount_value_amount: string | number
  is_platform_wide_super_admin_offer: boolean
  target_organization_id?: number | null
  is_active: boolean
  current_total_redemption_count: number
}

const SCOPES = [
  'order_level_cart_total',
  'product_item_wise',
  'category_group_wise',
  'coupon_code_redeem',
  'seasonal_date_window',
  'super_admin_organization_offer',
]

export default function DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage() {
  const user = useAuthStore((s) => s.user)
  const orgId = useAuthStore((s) => s.organizationId)
  const isSuper = user?.role === 'super_admin'
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    promotion_display_name: '',
    coupon_code_normalized: '',
    discount_scope_type: 'coupon_code_redeem',
    discount_value_type: 'percentage_of_base',
    discount_value_amount: '10',
    minimum_order_subtotal_amount: '',
    maximum_discount_cap_amount: '',
    applies_to_product_id: '',
    applies_to_category_id: '',
    valid_from_utc: '',
    valid_until_utc: '',
    target_organization_id: '',
    as_platform_offer: false,
  })

  const list = useQuery({
    queryKey: ['discount-promotions', orgId],
    enabled: !!orgId || isSuper,
    queryFn: async () =>
      (
        await api.get<DiscountPromotionRule[]>(
          '/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management/list-organization-owned-and-applicable-super-admin-offers'
        )
      ).data,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        promotion_display_name: form.promotion_display_name,
        coupon_code_normalized: form.coupon_code_normalized || null,
        discount_scope_type: form.discount_scope_type,
        discount_value_type: form.discount_value_type,
        discount_value_amount: Number(form.discount_value_amount),
        minimum_order_subtotal_amount: form.minimum_order_subtotal_amount
          ? Number(form.minimum_order_subtotal_amount)
          : null,
        maximum_discount_cap_amount: form.maximum_discount_cap_amount
          ? Number(form.maximum_discount_cap_amount)
          : null,
        applies_to_product_id: form.applies_to_product_id ? Number(form.applies_to_product_id) : null,
        applies_to_category_id: form.applies_to_category_id ? Number(form.applies_to_category_id) : null,
        valid_from_utc: form.valid_from_utc || null,
        valid_until_utc: form.valid_until_utc || null,
        is_active: true,
      }
      if (isSuper && form.as_platform_offer) {
        body.target_organization_id = form.target_organization_id
          ? Number(form.target_organization_id)
          : null
        return (
          await api.post(
            '/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management/super-admin-create-platform-offer-targeted-to-organization',
            body
          )
        ).data
      }
      return (
        await api.post(
          '/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management/create-organization-level-discount-promotion-rule',
          body
        )
      ).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discount-promotions'] })
      setMsg('Promotion saved')
      setError('')
      setForm({ ...form, promotion_display_name: '', coupon_code_normalized: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId && !isSuper) {
    return (
      <Card>
        <p className="text-sm font-medium text-slate-600">Select an organization to manage promotions.</p>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Promotions"
        title="Discount · coupon · seasonal · item offers"
        subtitle="Org admins create local offers. Super admin can push platform offers to organizations."
      />
      {msg && (
        <div className="mb-3">
          <Alert tone="success">{msg}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Create promotion">
          <div className="space-y-3">
            <Input
              label="Display name *"
              value={form.promotion_display_name}
              onChange={(e) => setForm({ ...form, promotion_display_name: e.target.value })}
            />
            <Input
              label="Coupon code (optional)"
              value={form.coupon_code_normalized}
              onChange={(e) => setForm({ ...form, coupon_code_normalized: e.target.value.toUpperCase() })}
            />
            <Select
              label="Scope"
              value={form.discount_scope_type}
              onChange={(e) => setForm({ ...form, discount_scope_type: e.target.value })}
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              label="Value type"
              value={form.discount_value_type}
              onChange={(e) => setForm({ ...form, discount_value_type: e.target.value })}
            >
              <option value="percentage_of_base">Percentage</option>
              <option value="fixed_amount_off">Fixed amount</option>
            </Select>
            <Input
              label="Value"
              type="number"
              value={form.discount_value_amount}
              onChange={(e) => setForm({ ...form, discount_value_amount: e.target.value })}
            />
            <Input
              label="Min order subtotal"
              type="number"
              value={form.minimum_order_subtotal_amount}
              onChange={(e) => setForm({ ...form, minimum_order_subtotal_amount: e.target.value })}
            />
            <Input
              label="Max discount cap"
              type="number"
              value={form.maximum_discount_cap_amount}
              onChange={(e) => setForm({ ...form, maximum_discount_cap_amount: e.target.value })}
            />
            <Input
              label="Product ID (item-wise)"
              value={form.applies_to_product_id}
              onChange={(e) => setForm({ ...form, applies_to_product_id: e.target.value })}
            />
            <Input
              label="Category ID (category-wise)"
              value={form.applies_to_category_id}
              onChange={(e) => setForm({ ...form, applies_to_category_id: e.target.value })}
            />
            <Input
              label="Valid from (ISO)"
              value={form.valid_from_utc}
              onChange={(e) => setForm({ ...form, valid_from_utc: e.target.value })}
              placeholder="2026-08-01T00:00:00+00:00"
            />
            <Input
              label="Valid until (ISO)"
              value={form.valid_until_utc}
              onChange={(e) => setForm({ ...form, valid_until_utc: e.target.value })}
            />
            {isSuper && (
              <>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={form.as_platform_offer}
                    onChange={(e) => setForm({ ...form, as_platform_offer: e.target.checked })}
                  />
                  Super admin platform offer to organization
                </label>
                {form.as_platform_offer && (
                  <Input
                    label="Target organization ID (empty = all orgs)"
                    value={form.target_organization_id}
                    onChange={(e) => setForm({ ...form, target_organization_id: e.target.value })}
                  />
                )}
              </>
            )}
            <Button
              disabled={!form.promotion_display_name || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Save promotion
            </Button>
          </div>
        </Card>

        <Card title="Active & available rules" subtitle="Org + super-admin offers">
          {list.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {(list.data || []).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-bold">{r.promotion_display_name}</div>
                    {r.is_platform_wide_super_admin_offer && <Badge tone="purple">Platform</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {r.coupon_code_normalized || '-'} · {r.discount_scope_type}
                  </div>
                  <div className="text-sm font-bold text-orange-700 mt-1">
                    {r.discount_value_type === 'percentage_of_base'
                      ? `${r.discount_value_amount}%`
                      : `${r.discount_value_amount} off`}{' '}
                    · redeemed {r.current_total_redemption_count}
                  </div>
                </div>
              ))}
              {!list.data?.length && <p className="text-sm text-slate-500">No promotions yet.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
