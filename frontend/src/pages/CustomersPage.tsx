import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Customer, type Page } from '@/lib/api'
import { Alert, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, Textarea } from '@/components/ui'
import { Contact, Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n/useT'

export default function CustomersPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', orgId, q],
    enabled: !!orgId,
    queryFn: async () =>
      (await api.get<Page<Customer>>('/terminals/customers', { params: { page_size: 100, q: q || undefined } })).data,
  })

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/terminals/customers', form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false)
      setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} /></Card>
  }

  return (
    <div>
      <PageHeader
        breadcrumb={t('customers.breadcrumb')}
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={<Button onClick={() => { setError(''); setOpen(true) }}><Plus size={16} /> {t('customers.add')}</Button>}
      />

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
        <input
          className="w-full rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          placeholder={t('customers.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card>
          <EmptyState icon={<Contact size={24} />} title={t('customers.empty')} action={<Button onClick={() => setOpen(true)}>{t('customers.add')}</Button>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.items.map((c) => (
            <div key={c.id} className="premium-card p-5">
              <div className="font-bold text-lg">{c.name}</div>
              <div className="text-sm text-ink-500 mt-2 space-y-1">
                {c.phone && <div>📞 {c.phone}</div>}
                {c.email && <div>✉ {c.email}</div>}
                {c.address && <div className="line-clamp-2">📍 {c.address}</div>}
              </div>
              {c.notes && <p className="text-xs text-ink-400 mt-3 line-clamp-2">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('customers.newTitle')}>
        <div className="space-y-4">
          <Input label={t('customers.nameLabel')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('customers.phoneLabel')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('customers.emailLabel')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Textarea label={t('customers.addressLabel')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Textarea label={t('customers.notesLabel')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={!form.name || createMut.isPending} onClick={() => { setError(''); createMut.mutate() }}>{t('customers.save')}</Button>
        </div>
      </Modal>
    </div>
  )
}
