import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, PageHeader, Select, Spinner, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useT } from '@/i18n/useT'

type ReportMeta = { code: string; name: string; scope: string }

export default function ReportHubPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const t = useT()
  const [days, setDays] = useState('30')
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  const catalog = useQuery({
    queryKey: ['report-catalog'],
    queryFn: async () => (await api.get<{ reports: ReportMeta[]; base_currency: string }>('/report-hub/catalog')).data,
  })

  const run = useQuery({
    queryKey: ['report-run', selected, days, orgId],
    enabled: !!selected,
    queryFn: async () =>
      (await api.get(`/report-hub/run/${selected}`, { params: { days: Number(days) } })).data,
  })

  async function download(fmt: 'xlsx' | 'pdf') {
    if (!selected) return
    setError('')
    try {
      const res = await api.get(`/report-hub/export/${selected}`, {
        params: { fmt, days: Number(days) },
        responseType: 'blob',
      })
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
      // Empty reports still download a valid file with a "No data" row
      if (blob.size === 0) {
        setError(t('reportHub.emptyExport'))
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected}.${fmt === 'xlsx' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(errMsg(e) || t('reportHub.exportFailed'))
    }
  }

  const reports = catalog.data?.reports || []

  return (
    <div>
      <PageHeader
        breadcrumb={t('reportHub.breadcrumb')}
        title={t('reportHub.title')}
        subtitle={t('reportHub.subtitle', { currency: catalog.data?.base_currency || 'AED' })}
        actions={
          <div className="flex gap-2">
            <Select className="w-32" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">{t('reportHub.range.1')}</option>
              <option value="7">{t('reportHub.range.7')}</option>
              <option value="30">{t('reportHub.range.30')}</option>
              <option value="90">{t('reportHub.range.90')}</option>
              <option value="365">{t('reportHub.range.365')}</option>
            </Select>
            <Button variant="secondary" disabled={!selected} onClick={() => download('xlsx')}>
              <FileSpreadsheet size={16} /> {t('reportHub.excel')}
            </Button>
            <Button variant="secondary" disabled={!selected} onClick={() => download('pdf')}>
              <FileText size={16} /> {t('reportHub.pdf')}
            </Button>
          </div>
        }
      />

      {user?.role === 'super_admin' && !orgId && (
        <Alert tone="warning">{t('reportHub.superAdminNeedsOrg')}</Alert>
      )}
      {error && <div className="mb-3"><Alert tone="danger">{error}</Alert></div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={t('reportHub.catalog')} subtitle={t('reportHub.catalogSubtitle', { count: reports.length })} className="lg:col-span-1">
          {catalog.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-1 max-h-[40vh] sm:max-h-[70vh] overflow-y-auto">
              {reports.map((r) => (
                <button
                  key={r.code}
                  onClick={() => setSelected(r.code)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-sm border ${
                    selected === r.code
                      ? 'border-orange-500 bg-orange-50 font-bold'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{r.name}</span>
                    <Badge tone={r.scope === 'platform' ? 'purple' : 'info'}>{r.scope}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="lg:col-span-2"
          title={run.data?.title || t('reportHub.preview')}
          subtitle={selected ? t('reportHub.rowsMeta', { count: run.data?.count ?? 0, from: run.data?.from || '', to: run.data?.to || '' }) : t('reportHub.pickReport')}
          action={
            selected ? (
              <Button size="sm" onClick={() => download('xlsx')}>
                <Download size={14} /> {t('reportHub.download')}
              </Button>
            ) : undefined
          }
        >
          {!selected ? (
            <p className="text-sm text-slate-500 font-medium">{t('reportHub.chooseToPreview')}</p>
          ) : run.isLoading ? (
            <Spinner />
          ) : run.isError ? (
            <Alert tone="danger">{errMsg(run.error)}</Alert>
          ) : (
            <div className="table-scroll overflow-x-auto max-h-[50vh] sm:max-h-[65vh]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {(run.data?.headers || []).map((h: string) => (
                      <th key={h} className="text-left px-2 py-2 font-bold text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(run.data?.rows || []).slice(0, 200).map((row: string[], i: number) => (
                    <tr key={i} className="border-t border-slate-100">
                      {row.map((c, j) => (
                        <td key={j} className="px-2 py-1.5 whitespace-nowrap">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(run.data?.count || 0) > 200 && (
                <p className="text-xs text-slate-500 mt-2">{t('reportHub.showingFirst200')}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
