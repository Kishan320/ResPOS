import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, Mail, RotateCcw, Trash2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, PageHeader, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n/useT'

type ContactLead = {
  id: number
  name?: string | null
  email: string
  phone?: string | null
  message?: string | null
  payload_json?: Record<string, unknown> | null
  status: string
  is_resolved: boolean
  resolved_at?: string | null
  admin_note?: string | null
  created_at?: string | null
}

export default function SuperAdminContactLeadsPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const t = useT()
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  if (user?.role !== 'super_admin') {
    return <Navigate to="/app" replace />
  }

  const contacts = useQuery({
    queryKey: ['cms-contacts', filter],
    queryFn: async () => {
      const q = filter === 'all' ? '' : `?status=${filter}`
      return (await api.get<ContactLead[]>(`/cms/contacts${q}`)).data
    },
  })

  const resolveContact = useMutation({
    mutationFn: async (args: { id: number; is_resolved: boolean }) =>
      (await api.patch(`/cms/contacts/${args.id}`, { is_resolved: args.is_resolved })).data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['cms-contacts'] })
      setError('')
      setMsg(vars.is_resolved ? t('leads.markedResolved') : t('leads.reopened'))
    },
    onError: (e) => setError(errMsg(e)),
  })

  const deleteContact = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/cms/contacts/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-contacts'] })
      setMsg(t('cms.contactDeleted'))
    },
    onError: (e) => setError(errMsg(e)),
  })

  const openCount = useMemo(
    () => (contacts.data || []).filter((c) => !c.is_resolved).length,
    [contacts.data]
  )

  return (
    <div>
      <PageHeader
        breadcrumb={t('leads.breadcrumb')}
        title={t('leads.title')}
        subtitle={t('leads.subtitle')}
      />

      {msg && (
        <div className="mb-4">
          <Alert tone="success">{msg}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center mb-4">
        {(['open', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f)
              setMsg('')
              setError('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold border capitalize ${
              filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'
            }`}
          >
            {f === 'open' ? t('leads.filter.open') : f === 'resolved' ? t('leads.filter.resolved') : t('leads.filter.all')}
          </button>
        ))}
        <span className="text-sm font-semibold text-slate-500 ml-1">
          {filter === 'open' ? t('leads.openCount', { count: openCount }) : t('leads.shownCount', { count: contacts.data?.length || 0 })}
        </span>
      </div>

      <Card
        title={t('leads.inbox')}
        subtitle={t('leads.inboxSubtitle')}
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Mail size={14} /> {t('leads.landingForm')}
          </span>
        }
      >
        {contacts.isLoading ? (
          <Spinner />
        ) : (contacts.data || []).length === 0 ? (
          <p className="text-sm font-medium text-slate-500 py-6 text-center">
            {t('leads.emptyPrefix')} {filter === 'open' ? t('leads.emptyOpen') : t('leads.emptyHere')} {t('leads.emptySuffix')}
          </p>
        ) : (
          <div className="space-y-3">
            {(contacts.data || []).map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl border p-4 ${
                  c.is_resolved ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900">
                      {c.name || t('cms.noName')} ·{' '}
                      <a href={`mailto:${c.email}`} className="text-emerald-700 hover:underline">
                        {c.email}
                      </a>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      {c.phone || t('cms.noPhone')}
                      {c.created_at ? ` · ${new Date(c.created_at).toLocaleString()}` : ''}
                      {' · '}
                      <span className={c.is_resolved ? 'text-slate-500' : 'text-emerald-700 font-bold'}>
                        {c.is_resolved ? t('leads.filter.resolved') : t('leads.filter.open')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!c.is_resolved ? (
                      <Button
                        size="sm"
                        onClick={() => resolveContact.mutate({ id: c.id, is_resolved: true })}
                        disabled={resolveContact.isPending}
                      >
                        <CheckCircle2 size={14} /> {t('cms.markResolved')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => resolveContact.mutate({ id: c.id, is_resolved: false })}
                        disabled={resolveContact.isPending}
                      >
                        <RotateCcw size={14} /> {t('cms.reopen')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(t('leads.deleteConfirm'))) deleteContact.mutate(c.id)
                      }}
                    >
                      <Trash2 size={14} /> {t('common.delete')}
                    </Button>
                  </div>
                </div>
                {c.message && (
                  <p className="mt-3 text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {c.message}
                  </p>
                )}
                {c.payload_json && Object.keys(c.payload_json).length > 0 && (
                  <details className="mt-2 text-xs text-slate-500">
                    <summary className="cursor-pointer font-bold">{t('cms.allSubmittedFields')}</summary>
                    <pre className="mt-2 overflow-auto rounded-xl bg-white border border-slate-100 p-3">
                      {JSON.stringify(c.payload_json, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
