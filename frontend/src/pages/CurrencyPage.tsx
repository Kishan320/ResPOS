import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Badge, Button, Card, Input, PageHeader, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

type Currency = {
  id: number
  code: string
  name: string
  symbol: string
  is_base: boolean
  is_active: boolean
}
type Rate = { id: number; base_code: string; quote_code: string; rate: string; rate_date: string }

export default function CurrencyPage() {
  const user = useAuthStore((s) => s.user)
  const isSuper = user?.role === 'super_admin'
  const [quote, setQuote] = useState('USD')
  const [rate, setRate] = useState('0.2723')
  const [amount, setAmount] = useState('100')
  const [toCode, setToCode] = useState('USD')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => (await api.get<Currency[]>('/currency/list')).data,
  })
  const rates = useQuery({
    queryKey: ['fx-rates'],
    queryFn: async () => (await api.get<Rate[]>('/currency/rates')).data,
  })
  const convert = useQuery({
    queryKey: ['fx-convert', amount, toCode],
    queryFn: async () =>
      (await api.get('/currency/convert', { params: { amount, from_code: 'AED', to_code: toCode } })).data,
  })

  const saveRate = useMutation({
    mutationFn: async () =>
      (await api.post('/currency/rates', { quote_code: quote, rate: Number(rate), base_code: 'AED' })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fx-rates'] })
      setMsg('Daily rate saved (base AED)')
      setError('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  return (
    <div>
      <PageHeader
        breadcrumb="Finance"
        title="Multi-currency"
        subtitle="Base currency is AED. Super admin maintains daily rates for the world. Conversion is AED-centric and indexed."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs font-bold uppercase text-slate-500">Base currency</div>
          <div className="text-3xl font-black text-orange-600 mt-1">AED</div>
          <div className="text-sm font-medium text-slate-600 mt-1">UAE Dirham</div>
        </Card>
        <Card>
          <div className="text-xs font-bold uppercase text-slate-500">Active currencies</div>
          <div className="text-3xl font-black mt-1">{list.data?.length ?? '-'}</div>
        </Card>
        <Card>
          <div className="text-xs font-bold uppercase text-slate-500">Convert {amount} AED → {toCode}</div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {convert.data?.amount ? Number(convert.data.amount).toFixed(4) : '-'}
          </div>
        </Card>
      </div>

      {msg && <div className="mb-3"><Alert tone="success">{msg}</Alert></div>}
      {error && <div className="mb-3"><Alert tone="danger">{error}</Alert></div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="World currencies" subtitle="Dynamic list">
          {list.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(list.data || []).map((c) => (
                <div key={c.code} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <div className="font-bold">
                      {c.symbol} {c.code}
                    </div>
                    <div className="text-xs text-slate-500">{c.name}</div>
                  </div>
                  {c.is_base && <Badge tone="success">BASE</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Daily rates (1 AED = ?)" subtitle="Latest per quote">
          {rates.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              {(rates.data || []).map((r) => (
                <div key={r.id} className="flex justify-between text-sm border-b border-slate-100 py-2">
                  <span className="font-bold">
                    AED → {r.quote_code}
                  </span>
                  <span className="font-mono">{r.rate}</span>
                  <span className="text-xs text-slate-400">{r.rate_date}</span>
                </div>
              ))}
            </div>
          )}
          {isSuper && (
            <div className="grid grid-cols-3 gap-2 items-end border-t border-slate-100 pt-3">
              <Input label="Quote" value={quote} onChange={(e) => setQuote(e.target.value.toUpperCase())} />
              <Input label="Rate" value={rate} onChange={(e) => setRate(e.target.value)} />
              <Button disabled={saveRate.isPending} onClick={() => saveRate.mutate()}>
                Save rate
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Input label="Amount AED" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="To code" value={toCode} onChange={(e) => setToCode(e.target.value.toUpperCase())} />
          </div>
        </Card>
      </div>
    </div>
  )
}
