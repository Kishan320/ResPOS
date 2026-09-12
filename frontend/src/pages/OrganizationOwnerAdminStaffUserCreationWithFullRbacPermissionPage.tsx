/**
 * OrganizationOwnerAdminStaffUserCreationWithFullRbacPermissionPage
 * Org owner/admin creates cashiers, managers, staff with module-level RBAC.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

type Module = { id: number; code: string; name: string; super_only: boolean }
type StaffUser = {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
}

const ORG_ROLES = ['org_admin', 'manager', 'cashier', 'staff'] as const

export default function OrganizationOwnerAdminStaffUserCreationWithFullRbacPermissionPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
    role: 'cashier',
    pin_code: '',
  })
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const modules = useQuery({
    queryKey: ['rbac-modules-org-staff'],
    queryFn: async () => (await api.get<Module[]>('/rbac/modules')).data,
  })
  const staff = useQuery({
    queryKey: ['org-staff-users', orgId],
    enabled: !!orgId || user?.role === 'org_admin',
    queryFn: async () =>
      (
        await api.get<{ items: StaffUser[] }>(
          '/organization-owner-admin-staff-user-creation-with-full-rbac-permission/list-staff-users-belonging-to-current-organization'
        )
      ).data,
  })

  useEffect(() => {
    if (!modules.data) return
    const init: Record<string, boolean> = {}
    for (const m of modules.data.filter((x) => !x.super_only)) {
      // sensible defaults by role can be refined later
      init[m.code] = ['dashboard', 'pos', 'products', 'orders', 'invoices'].includes(m.code)
    }
    setSelected(init)
  }, [modules.data])

  const createMut = useMutation({
    mutationFn: async () => {
      const grants = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([module_code]) => ({
          module_code,
          can_view: true,
          can_create: form.role !== 'cashier',
          can_edit: form.role !== 'cashier',
          can_delete: form.role === 'org_admin',
          can_export: form.role !== 'staff',
        }))
      return (
        await api.post(
          '/organization-owner-admin-staff-user-creation-with-full-rbac-permission/create-organization-staff-user-with-module-permission-grants',
          { ...form, module_permission_grants: grants }
        )
      ).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-staff-users'] })
      setMsg('Staff user created with RBAC')
      setError('')
      setForm({ email: '', username: '', full_name: '', password: '', phone: '', role: 'cashier', pin_code: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId && user?.role !== 'org_admin') {
    return (
      <Card>
        <EmptyState
          title="Organization context required"
          description="Select active tenant (super admin) or login as organization owner."
        />
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Organization owner"
        title="Staff users with full RBAC"
        subtitle="Create managers, cashiers and staff. Each user receives module-level view/create/edit/delete/export grants."
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
        <Card title="Create staff user">
          <div className="space-y-3">
            <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="POS PIN" value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ORG_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <div>
              <div className="text-sm font-bold mb-2">Module access</div>
              <div className="max-h-52 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-3">
                {(modules.data || [])
                  .filter((m) => !m.super_only)
                  .map((m) => (
                    <label key={m.code} className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={!!selected[m.code]}
                        onChange={() => setSelected((s) => ({ ...s, [m.code]: !s[m.code] }))}
                      />
                      {m.name}
                    </label>
                  ))}
              </div>
            </div>
            <Button
              disabled={createMut.isPending || !form.email || !form.password}
              onClick={() => createMut.mutate()}
            >
              Create staff with permissions
            </Button>
          </div>
        </Card>
        <Card title="Organization users">
          {staff.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2">
              {(staff.data?.items || []).map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-bold">{u.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {u.role} · {u.username} · {u.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
