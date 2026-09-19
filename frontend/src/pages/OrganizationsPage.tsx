import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, labelize, type Organization, type Page } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Textarea } from '@/components/ui'
import { Building2, CheckCircle2, Plus, Search } from 'lucide-react'
import { useT, useTEnum } from '@/i18n/useT'

const BUSINESS_TYPES = [
  'restaurant', 'cafe', 'fast_food', 'grocery', 'kirana', 'supermarket', 'retail', 'bakery', 'other',
]

const emptyForm = {
  name: '',
  business_type: 'restaurant',
  email: '',
  phone: '',
  city: '',
  state: '',
  country: 'AE',
  address_line1: '',
  tax_id: '',
  currency_code: 'AED',
  timezone: 'Asia/Dubai',
  notes: '',
  admin_email: '',
  admin_password: '',
  admin_name: '',
}

export default function OrganizationsPage() {
  const t = useT()
  const tEnum = useTEnum()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Organization | null>(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const { organizationId, setOrganization, user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', q, typeFilter],
    queryFn: async () =>
      (
        await api.get<Page<Organization>>('/organizations', {
          params: { q: q || undefined, business_type: typeFilter || undefined, page_size: 100 },
        })
      ).data,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        business_type: form.business_type,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || 'AE',
        address_line1: form.address_line1 || null,
        tax_id: form.tax_id || null,
        currency_code: form.currency_code || 'AED',
        timezone: form.timezone || 'Asia/Dubai',
        notes: form.notes || null,
      }
      // Organization owner admin (required for real onboarding hierarchy)
      if (form.admin_email && form.admin_password) {
        payload.admin_email = form.admin_email
        payload.admin_password = form.admin_password
        payload.admin_name = form.admin_name || `${form.name} Owner`
      }
      return (await api.post('/organizations', payload)).data as Organization
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false)
      setForm(emptyForm)
      setOrganization(org.id, org.name)
    },
    onError: (e) => setError(errMsg(e)),
  })

  const updateMut = useMutation({
    mutationFn: async (payload: Partial<Organization> & { is_active?: boolean }) =>
      (await api.patch(`/organizations/${detail!.id}`, payload)).data as Organization,
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ['organizations'] })
      setDetail(org)
      if (organizationId === org.id) setOrganization(org.id, org.name)
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (user?.role !== 'super_admin') {
    return (
      <Card>
        <EmptyState title={t('empty.superAdminOnly')} description={t('empty.superAdminOnlyHint')} />
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb={t('orgs.breadcrumb')}
        title={t('orgs.title')}
        subtitle={t('orgs.subtitle')}
        actions={
          <Button onClick={() => { setError(''); setOpen(true) }}>
            <Plus size={16} /> {t('orgs.new')}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input
            className="w-full rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            placeholder={t('orgs.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select className="sm:w-48" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">{t('orgs.filter.all')}</option>
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>{tEnum('businessTypes', bt, labelize(bt))}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card>
          <EmptyState
            icon={<Building2 size={24} />}
            title={t('orgs.empty')}
            description={t('orgs.emptyHint')}
            action={<Button onClick={() => setOpen(true)}><Plus size={16} /> {t('orgs.createAction')}</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.items.map((org) => {
            const active = organizationId === org.id
            return (
              <div
                key={org.id}
                className={`premium-card p-5 transition hover:-translate-y-0.5 ${active ? 'ring-2 ring-brand-500 shadow-xl shadow-brand-600/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">{org.name}</h3>
                    <p className="text-sm text-ink-500 capitalize mt-0.5">
                      {labelize(org.business_type)}
                      {org.city ? ` · ${org.city}` : ''}
                    </p>
                  </div>
                  <Badge tone={org.is_active ? 'success' : 'neutral'}>{org.is_active ? t('common.active') : t('common.inactive')}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-500">
                  <div>{t('orgs.currency')} <span className="text-ink-800 dark:text-ink-200 font-medium">{org.currency_code}</span></div>
                  <div>{t('orgs.timezone')} <span className="text-ink-800 dark:text-ink-200 font-medium truncate">{org.timezone}</span></div>
                  <div className="col-span-2 truncate">{t('orgs.slug')} {org.slug}</div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={active ? 'success' : 'primary'}
                    onClick={() => setOrganization(org.id, org.name)}
                  >
                    {active ? <><CheckCircle2 size={14} /> {t('orgs.activeTenant')}</> : t('orgs.useAsActiveTenant')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setDetail(org); setError('') }}>
                    {t('common.details')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('orgs.createTitle')} subtitle={t('orgs.createSubtitle')} xwide>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label={t('orgs.businessName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('orgs.businessNamePlaceholder')} />
          <Select label={t('orgs.businessType')} value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
            {BUSINESS_TYPES.map((bt) => <option key={bt} value={bt}>{tEnum('businessTypes', bt, labelize(bt))}</option>)}
          </Select>
          <Input label={t('orgs.emailLabel')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={t('orgs.phoneLabel')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('orgs.cityLabel')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label={t('orgs.stateLabel')} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label={t('orgs.countryLabel')} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input label={t('orgs.addressLabel')} value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
          <Input label={t('orgs.taxIdLabel')} value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          <Input label={t('orgs.currencyLabel')} value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} />
          <Input label={t('orgs.timezoneLabel')} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea label={t('orgs.notesLabel')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 border-t border-ink-100 dark:border-ink-800 pt-5">
          <h4 className="font-semibold mb-1">{t('orgs.ownerSection')}</h4>
          <p className="text-xs font-medium text-slate-500 mb-3">
            {t('orgs.ownerHint')}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label={t('orgs.adminName')} value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} />
            <Input label={t('orgs.adminEmail')} value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
            <Input label={t('orgs.adminPassword')} type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
          </div>
        </div>
        {error && <div className="mt-4"><Alert tone="danger">{error}</Alert></div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button disabled={!form.name || createMut.isPending} onClick={() => { setError(''); createMut.mutate() }}>
            {createMut.isPending ? t('orgs.creating') : t('orgs.createActivate')}
          </Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || t('orgs.detailTitle')} subtitle={t('orgs.detailSubtitle')} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-ink-500">{t('orgs.field.type')}</span><div className="font-medium capitalize">{tEnum('businessTypes', detail.business_type, labelize(detail.business_type))}</div></div>
              <div><span className="text-ink-500">{t('orgs.field.city')}</span><div className="font-medium">{detail.city || '-'}</div></div>
              <div><span className="text-ink-500">{t('orgs.field.phone')}</span><div className="font-medium">{detail.phone || '-'}</div></div>
              <div><span className="text-ink-500">{t('orgs.field.taxId')}</span><div className="font-medium">{detail.tax_id || '-'}</div></div>
              <div className="sm:col-span-2"><span className="text-ink-500">{t('orgs.field.address')}</span><div className="font-medium">{detail.address_line1 || '-'}</div></div>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setOrganization(detail.id, detail.name); setDetail(null) }}>{t('orgs.setActive')}</Button>
              <Button
                variant="secondary"
                disabled={updateMut.isPending}
                onClick={() => updateMut.mutate({ is_active: !detail.is_active })}
              >
                {detail.is_active ? t('orgs.deactivate') : t('orgs.activate')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
