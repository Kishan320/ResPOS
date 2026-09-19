/**
 * DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage
 * Manage coupons, seasonal offers, item/category discounts; super admin org offers.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n/useT'

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
  const t = useT()
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
      setMsg(t('discounts.saved'))
      setError('')
      setForm({ ...form, promotion_display_name: '', coupon_code_normalized: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId && !isSuper) {
    return (
      <Card>
        <p className="text-sm font-medium text-slate-600">{t('discounts.pickOrgHint')}</p>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb={t('discounts.breadcrumb')}
        title={t('discounts.title')}
        subtitle={t('discounts.subtitle')}
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
        <Card title={t('discounts.createTitle')}>
          <div className="space-y-3">
            <Input
              label={t('discounts.displayName')}
              value={form.promotion_display_name}
              onChange={(e) => setForm({ ...form, promotion_display_name: e.target.value })}
            />
            <Input
              label={t('discounts.couponCode')}
              value={form.coupon_code_normalized}
              onChange={(e) => setForm({ ...form, coupon_code_normalized: e.target.value.toUpperCase() })}
            />
            <Select
              label={t('discounts.scope')}
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
              label={t('discounts.valueType')}
              value={form.discount_value_type}
              onChange={(e) => setForm({ ...form, discount_value_type: e.target.value })}
            >
              <option value="percentage_of_base">{t('discounts.valueType.percentage')}</option>
              <option value="fixed_amount_off">{t('discounts.valueType.fixed')}</option>
            </Select>
            <Input
              label={t('discounts.value')}
              type="number"
              value={form.discount_value_amount}
              onChange={(e) => setForm({ ...form, discount_value_amount: e.target.value })}
            />
            <Input
              label={t('discounts.minSubtotal')}
              type="number"
              value={form.minimum_order_subtotal_amount}
              onChange={(e) => setForm({ ...form, minimum_order_subtotal_amount: e.target.value })}
            />
            <Input
              label={t('discounts.maxCap')}
              type="number"
              value={form.maximum_discount_cap_amount}
              onChange={(e) => setForm({ ...form, maximum_discount_cap_amount: e.target.value })}
            />
            <Input
              label={t('discounts.productId')}
              value={form.applies_to_product_id}
              onChange={(e) => setForm({ ...form, applies_to_product_id: e.target.value })}
            />
            <Input
              label={t('discounts.categoryId')}
              value={form.applies_to_category_id}
              onChange={(e) => setForm({ ...form, applies_to_category_id: e.target.value })}
            />
            <Input
              label={t('discounts.validFrom')}
              value={form.valid_from_utc}
              onChange={(e) => setForm({ ...form, valid_from_utc: e.target.value })}
              placeholder="2026-08-01T00:00:00+00:00"
            />
            <Input
              label={t('discounts.validUntil')}
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
                  {t('discounts.platformOffer')}
                </label>
                {form.as_platform_offer && (
                  <Input
                    label={t('discounts.targetOrg')}
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
              {t('discounts.save')}
            </Button>
          </div>
        </Card>

        <Card title={t('discounts.rulesTitle')} subtitle={t('discounts.rulesSubtitle')}>
          {list.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {(list.data || []).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex justify-between gap-2">
                    <div className="font-bold">{r.promotion_display_name}</div>
                    {r.is_platform_wide_super_admin_offer && <Badge tone="purple">{t('discounts.platformBadge')}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {r.coupon_code_normalized || '-'} · {r.discount_scope_type}
                  </div>
                  <div className="text-sm font-bold text-orange-700 mt-1">
                    {r.discount_value_type === 'percentage_of_base'
                      ? `${r.discount_value_amount}%`
                      : t('discounts.amountOff', { amount: r.discount_value_amount })}{' '}
                    · {t('discounts.redeemed', { count: r.current_total_redemption_count })}
                  </div>
                </div>
              ))}
              {!list.data?.length && <p className="text-sm text-slate-500">{t('discounts.empty')}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
