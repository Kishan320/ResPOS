import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Organization, type Page } from '@/lib/api'
import { Alert, Button, Card, PageHeader, Select, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Navigate } from 'react-router-dom'

type Module = { id: number; code: string; name: string; super_only: boolean }
type Access = {
  module_id: number
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_export: boolean
  is_active: boolean
}

const emptyFlags = (module_id: number): Access => ({
  module_id,
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: false,
  can_export: true,
  is_active: true,
})

export default function RbacPage() {
  const user = useAuthStore((s) => s.user)
  const [orgId, setOrgId] = useState<string>('')
  const [matrix, setMatrix] = useState<Record<number, Access>>({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  if (user?.role !== 'super_admin') return <Navigate to="/app" replace />

  const modules = useQuery({
    queryKey: ['rbac-modules'],
    queryFn: async () => (await api.get<Module[]>('/rbac/modules')).data,
  })
  const orgs = useQuery({
    queryKey: ['orgs-rbac'],
    queryFn: async () => (await api.get<Page<Organization>>('/organizations', { params: { page_size: 200 } })).data,
  })
  const access = useQuery({
    queryKey: ['org-access', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Access[]>(`/rbac/org/${orgId}`)).data,
  })

  useEffect(() => {
    if (!modules.data) return
    const map: Record<number, Access> = {}
    for (const m of modules.data.filter((x) => !x.super_only)) {
      map[m.id] = emptyFlags(m.id)
    }
    if (access.data) {
      for (const a of access.data) map[a.module_id] = { ...emptyFlags(a.module_id), ...a }
    }
    setMatrix(map)
  }, [modules.data, access.data])

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.put('/rbac/org', {
          organization_id: Number(orgId),
          modules: Object.values(matrix).filter((m) => m.can_view || m.is_active),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-access', orgId] })
      setMsg('Module access saved for restaurant')
      setError('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  function toggle(mid: number, key: keyof Access) {
    setMatrix((prev) => {
      const cur = prev[mid] || emptyFlags(mid)
      if (typeof cur[key] === 'boolean') {
        return { ...prev, [mid]: { ...cur, [key]: !cur[key] } }
      }
      return prev
    })
  }

  const tenantModules = (modules.data || []).filter((m) => !m.super_only)

  return (
    <div>
      <PageHeader
        breadcrumb="Super admin · Malik"
        title="Access control (RBAC)"
        subtitle="Assign modules & permissions when onboarding restaurants. Super admin owns the platform."
      />

      <Card className="mb-4" title="Organization">
        <Select label="Select restaurant / shop" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">- Choose -</option>
          {(orgs.data?.items || []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} (#{o.id})
            </option>
          ))}
        </Select>
      </Card>

      {msg && <div className="mb-3"><Alert tone="success">{msg}</Alert></div>}
      {error && <div className="mb-3"><Alert tone="danger">{error}</Alert></div>}

      {!orgId ? (
        <Card><p className="text-sm font-medium text-slate-600">Select an organization to edit its module matrix.</p></Card>
      ) : modules.isLoading || access.isLoading ? (
        <Spinner />
      ) : (
        <div className="premium-card table-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-3">Module</th>
                <th className="px-2 py-3">View</th>
                <th className="px-2 py-3">Create</th>
                <th className="px-2 py-3">Edit</th>
                <th className="px-2 py-3">Delete</th>
                <th className="px-2 py-3">Export</th>
              </tr>
            </thead>
            <tbody>
              {tenantModules.map((m) => {
                const a = matrix[m.id] || emptyFlags(m.id)
                return (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold">
                      {m.name}
                      <div className="text-[11px] font-mono text-slate-400">{m.code}</div>
                    </td>
                    {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map((k) => (
                      <td key={k} className="text-center px-2">
                        <input type="checkbox" checked={!!a[k]} onChange={() => toggle(m.id, k)} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 border-t border-slate-100">
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Save access for org #{orgId}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
