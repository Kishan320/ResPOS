import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, money, type Page, type Terminal } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner } from '@/components/ui'
import { Plus, Monitor } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePosStore } from '@/store/posStore'

export default function TerminalsPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const setTerminalId = usePosStore((s) => s.setTerminalId)
  const activeTerminal = usePosStore((s) => s.terminalId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [cashFloat, setCashFloat] = useState('1000')
  const [printer, setPrinter] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['terminals', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Page<Terminal>>('/terminals', { params: { page_size: 100 } })).data,
  })

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/terminals', {
          name,
          location: location || null,
          cash_float: Number(cashFloat || 0),
          printer_name: printer || null,
        })
      ).data as Terminal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terminals'] })
      setOpen(false)
      setName('')
      setLocation('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title="Select an organization first" /></Card>
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Hardware"
        title="POS machines / terminals"
        subtitle="Cash drawers, counters, printer-linked stations with opening float."
        actions={<Button onClick={() => { setError(''); setOpen(true) }}><Plus size={16} /> Add terminal</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card>
          <EmptyState icon={<Monitor size={24} />} title="No terminals" description="Create a POS machine for the counter." action={<Button onClick={() => setOpen(true)}>Add terminal</Button>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.items.map((t) => (
            <div key={t.id} className={`premium-card p-5 ${activeTerminal === t.id ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/20">
                  <Monitor size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate">{t.name}</h3>
                    <Badge tone={t.is_active ? 'success' : 'neutral'}>{t.is_active ? 'Online' : 'Off'}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1 font-mono">{t.code}</p>
                  {t.location && <p className="text-sm text-ink-500 mt-1">{t.location}</p>}
                  <p className="text-sm mt-3">Cash float: <span className="font-bold">{money(t.cash_float)}</span></p>
                  {t.printer_name && <p className="text-xs text-ink-400 mt-1">Printer: {t.printer_name}</p>}
                  <Button size="sm" className="mt-4" variant={activeTerminal === t.id ? 'success' : 'secondary'} onClick={() => setTerminalId(t.id)}>
                    {activeTerminal === t.id ? 'Selected for POS' : 'Use on POS'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New POS terminal">
        <div className="space-y-4">
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Counter 1" />
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Front desk / Floor 2" />
          <Input label="Opening cash float" type="number" value={cashFloat} onChange={(e) => setCashFloat(e.target.value)} />
          <Input label="Printer name" value={printer} onChange={(e) => setPrinter(e.target.value)} />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={!name || createMut.isPending} onClick={() => { setError(''); createMut.mutate() }}>Create terminal</Button>
        </div>
      </Modal>
    </div>
  )
}
