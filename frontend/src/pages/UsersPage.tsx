import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, labelize, type Page, type User } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui'
import { Plus, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useT, useTEnum } from '@/i18n/useT'

const ROLES = ['org_admin', 'manager', 'cashier', 'staff'] as const

export default function UsersPage() {
  const { organizationId, user: me } = useAuthStore()
  const t = useT()
  const tEnum = useTEnum()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    role: 'cashier',
    pin_code: '',
  })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', organizationId],
    queryFn: async () =>
      (
        await api.get<Page<User>>('/users', {
          params: { page_size: 100, organization_id: organizationId || undefined },
        })
      ).data,
  })

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/users', {
          full_name: form.full_name,
          email: form.email,
          username: form.username || form.email.split('@')[0],
          password: form.password,
          phone: form.phone || null,
          role: form.role,
          pin_code: form.pin_code || null,
          organization_id: me?.role === 'super_admin' ? organizationId : undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      setForm({ full_name: '', email: '', username: '', password: '', phone: '', role: 'cashier', pin_code: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  return (
    <div>
      <PageHeader
        breadcrumb={t('users.breadcrumb')}
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <Button onClick={() => { setError(''); setOpen(true) }} disabled={me?.role === 'super_admin' && !organizationId}>
            <Plus size={16} /> {t('users.add')}
          </Button>
        }
      />

      {me?.role === 'super_admin' && !organizationId && (
        <Card className="mb-4"><Alert tone="warning">{t('users.superAdminNeedsOrg')}</Alert></Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card><EmptyState icon={<Users size={24} />} title={t('users.empty')} /></Card>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full text-sm table-row-hover">
              <thead className="bg-ink-50 dark:bg-ink-950 text-ink-500">
                <tr>
                  <th className="text-left px-4 py-3">{t('users.table.name')}</th>
                  <th className="text-left px-4 py-3">{t('users.table.username')}</th>
                  <th className="text-left px-4 py-3">{t('users.table.email')}</th>
                  <th className="text-left px-4 py-3">{t('users.table.role')}</th>
                  <th className="text-left px-4 py-3">{t('users.table.org')}</th>
                  <th className="text-left px-4 py-3">{t('users.table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="px-4 py-3 font-semibold">{u.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3"><Badge tone="purple">{tEnum('roles', u.role, labelize(u.role))}</Badge></td>
                    <td className="px-4 py-3">{u.organization_id ?? '-'}</td>
                    <td className="px-4 py-3"><Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? t('common.active') : t('common.off')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('users.createTitle')} subtitle={t('users.createSubtitle')}>
        <div className="space-y-4">
          <Input label={t('users.fullNameLabel')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label={t('users.emailLabel')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={t('users.usernameLabel')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} hint={t('users.usernameHint')} />
          <Input label={t('users.passwordLabel')} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label={t('users.phoneLabel')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('users.pinLabel')} value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
          <Select label={t('users.roleLabel')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{tEnum('roles', r, labelize(r))}</option>)}
          </Select>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={createMut.isPending || !form.email || !form.password || !form.full_name} onClick={() => { setError(''); createMut.mutate() }}>
            {t('users.create')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
