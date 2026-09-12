import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, PageHeader, Select, Spinner, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

type ReportMeta = { code: string; name: string; scope: string }

export default function ReportHubPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
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
        setError('Empty export file')
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
      setError(errMsg(e) || 'Export failed')
    }
  }

  const reports = catalog.data?.reports || []

  return (
    <div>
      <PageHeader
        breadcrumb="Analytics"
        title="Report hub · PDF & Excel"
        subtitle={`30+ deep reports · base currency ${catalog.data?.base_currency || 'AED'} · org + platform scopes`}
        actions={
          <div className="flex gap-2">
            <Select className="w-32" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </Select>
            <Button variant="secondary" disabled={!selected} onClick={() => download('xlsx')}>
              <FileSpreadsheet size={16} /> Excel
            </Button>
            <Button variant="secondary" disabled={!selected} onClick={() => download('pdf')}>
              <FileText size={16} /> PDF
            </Button>
          </div>
        }
      />

      {user?.role === 'super_admin' && !orgId && (
        <Alert tone="warning">Select an active organization for org-scoped reports. Platform reports work without it.</Alert>
      )}
      {error && <div className="mb-3"><Alert tone="danger">{error}</Alert></div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Catalog" subtitle={`${reports.length} reports`} className="lg:col-span-1">
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
          title={run.data?.title || 'Preview'}
          subtitle={selected ? `${run.data?.count ?? 0} rows · ${run.data?.from || ''} → ${run.data?.to || ''}` : 'Pick a report'}
          action={
            selected ? (
              <Button size="sm" onClick={() => download('xlsx')}>
                <Download size={14} /> Download
              </Button>
            ) : undefined
          }
        >
          {!selected ? (
            <p className="text-sm text-slate-500 font-medium">Choose any report to preview and export.</p>
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
                <p className="text-xs text-slate-500 mt-2">Showing first 200 rows - full data in Excel/PDF export.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
