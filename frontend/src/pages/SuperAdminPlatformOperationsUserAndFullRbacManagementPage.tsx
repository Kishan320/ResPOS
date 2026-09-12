/**
 * SuperAdminPlatformOperationsUserAndFullRbacManagementPage
 * Super admin (malik) creates platform operators with module permissions.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, Input, PageHeader, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

type Module = { id: number; code: string; name: string; super_only: boolean }
type PlatformUser = {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
}

export default function SuperAdminPlatformOperationsUserAndFullRbacManagementPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [form, setForm] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
  })
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  if (user?.role !== 'super_admin') return <Navigate to="/app" replace />

  const modules = useQuery({
    queryKey: ['rbac-modules-platform'],
    queryFn: async () => (await api.get<Module[]>('/rbac/modules')).data,
  })
  const users = useQuery({
    queryKey: ['platform-operators'],
    queryFn: async () =>
      (
        await api.get<{ items: PlatformUser[] }>(
          '/super-admin-platform-operations-user-and-full-rbac-management/list-all-platform-level-operator-users-without-organization'
        )
      ).data,
  })

  useEffect(() => {
    if (!modules.data) return
    const init: Record<string, boolean> = {}
    for (const m of modules.data) init[m.code] = m.super_only ? true : true
    setSelected(init)
  }, [modules.data])

  const createMut = useMutation({
    mutationFn: async () => {
      const grants = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([module_code]) => ({
          module_code,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
          can_export: true,
        }))
      return (
        await api.post(
          '/super-admin-platform-operations-user-and-full-rbac-management/create-platform-operator-user-with-full-module-permission-grants',
          { ...form, module_permission_grants: grants }
        )
      ).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-operators'] })
      setMsg('Platform operator created with RBAC grants')
      setError('')
      setForm({ email: '', username: '', full_name: '', password: '', phone: '' })
    },
    onError: (e) => setError(errMsg(e)),
  })

  return (
    <div>
      <PageHeader
        breadcrumb="Super admin · Malik"
        title="Platform operators & full RBAC"
        subtitle="Create super-admin-side users (no organization) and assign module permissions for platform operations."
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
        <Card title="Create platform operator">
          <div className="space-y-3">
            <Input label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div>
              <div className="text-sm font-bold mb-2">Module permissions</div>
              <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-3">
                {modules.isLoading ? (
                  <Spinner />
                ) : (
                  (modules.data || []).map((m) => (
                    <label key={m.code} className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={!!selected[m.code]}
                        onChange={() => setSelected((s) => ({ ...s, [m.code]: !s[m.code] }))}
                      />
                      {m.name} <span className="text-xs text-slate-400 font-mono">{m.code}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button
              disabled={createMut.isPending || !form.email || !form.password || !form.username}
              onClick={() => createMut.mutate()}
            >
              Create platform user
            </Button>
          </div>
        </Card>
        <Card title="Platform users (no org)">
          {users.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2">
              {(users.data?.items || []).map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-bold">{u.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {u.username} · {u.email} · {u.role}
                  </div>
                </div>
              ))}
              {!users.data?.items?.length && <p className="text-sm text-slate-500">Only super admin exists so far.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
