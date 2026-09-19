import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, money, type Category, type Page, type Product } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Textarea } from '@/components/ui'
import { Package, Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import ImageUpload from '@/components/ImageUpload'
import { mediaUrl } from '@/lib/media'
import { useT } from '@/i18n/useT'

const empty = {
  name: '',
  price: '',
  cost_price: '',
  tax_rate: '5',
  category_id: '',
  sku: '',
  barcode: '',
  unit: 'pcs',
  description: '',
  image_url: '' as string | null,
  initial_stock: '100',
  low_stock_threshold: '10',
  is_track_inventory: true,
  is_sold_by_weight: false,
}

export default function ProductsPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const t = useT()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(empty)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', orgId, q, categoryId],
    enabled: !!orgId,
    queryFn: async () =>
      (
        await api.get<Page<Product>>('/catalog/products', {
          params: { q: q || undefined, category_id: categoryId || undefined, page_size: 100, is_active: undefined },
        })
      ).data,
  })

  const { data: cats } = useQuery({
    queryKey: ['categories', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Page<Category>>('/catalog/categories', { params: { page_size: 200 } })).data,
  })

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/catalog/products', {
          name: form.name,
          price: Number(form.price),
          cost_price: form.cost_price ? Number(form.cost_price) : null,
          tax_rate: Number(form.tax_rate || 0),
          category_id: form.category_id ? Number(form.category_id) : null,
          sku: form.sku || null,
          barcode: form.barcode || null,
          unit: form.unit,
          description: form.description || null,
          image_url: form.image_url || null,
          initial_stock: Number(form.initial_stock || 0),
          low_stock_threshold: Number(form.low_stock_threshold || 0),
          is_track_inventory: form.is_track_inventory,
          is_sold_by_weight: form.is_sold_by_weight,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setOpen(false)
      setForm(empty)
    },
    onError: (e) => setError(errMsg(e)),
  })

  const updateMut = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/catalog/products/${edit!.id}`, {
          name: form.name,
          price: Number(form.price),
          cost_price: form.cost_price ? Number(form.cost_price) : null,
          tax_rate: Number(form.tax_rate || 0),
          category_id: form.category_id ? Number(form.category_id) : null,
          sku: form.sku || null,
          barcode: form.barcode || null,
          unit: form.unit,
          description: form.description || null,
          image_url: form.image_url || null,
          low_stock_threshold: Number(form.low_stock_threshold || 0),
          is_track_inventory: form.is_track_inventory,
          is_sold_by_weight: form.is_sold_by_weight,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setEdit(null)
      setForm(empty)
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return (
      <Card>
        <EmptyState title={t('empty.selectOrg')} description={t('empty.selectOrgHint')} />
      </Card>
    )
  }

  function openEdit(p: Product) {
    setEdit(p)
    setError('')
    setForm({
      name: p.name,
      price: String(Number(p.price)),
      cost_price: p.cost_price != null ? String(Number(p.cost_price)) : '',
      tax_rate: String(Number(p.tax_rate)),
      category_id: p.category_id ? String(p.category_id) : '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      unit: p.unit,
      description: p.description || '',
      image_url: p.image_url || '',
      initial_stock: '',
      low_stock_threshold: p.low_stock_threshold != null ? String(Number(p.low_stock_threshold)) : '10',
      is_track_inventory: p.is_track_inventory,
      is_sold_by_weight: !!p.is_sold_by_weight,
    })
  }

  const formFields = (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <ImageUpload
          label={t('products.imageLabel')}
          entity="products"
          value={form.image_url}
          onChange={(url) => setForm({ ...form, image_url: url })}
        />
      </div>
      <Input label={t('products.nameLabel')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label={t('products.priceLabel')} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <Input label={t('products.costPriceLabel')} type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
      <Input label={t('products.taxLabel')} type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
      <Select label={t('products.categoryLabel')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">{t('common.none')}</option>
        {cats?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Input label={t('products.unitLabel')} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={t('products.unitPlaceholder')} />
      <Input label={t('products.skuLabel')} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
      <Input label={t('products.barcodeLabel')} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
      {!edit && (
        <Input label={t('products.initialStockLabel')} type="number" value={form.initial_stock} onChange={(e) => setForm({ ...form, initial_stock: e.target.value })} />
      )}
      <Input label={t('products.lowStockLabel')} type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
      <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_track_inventory} onChange={(e) => setForm({ ...form, is_track_inventory: e.target.checked })} /> {t('products.trackInventory')}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_sold_by_weight} onChange={(e) => setForm({ ...form, is_sold_by_weight: e.target.checked })} /> {t('products.soldByWeight')}</label>
      </div>
      <div className="sm:col-span-2">
        <Textarea label={t('products.descriptionLabel')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        breadcrumb={t('products.breadcrumb')}
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={<Button onClick={() => { setForm(empty); setError(''); setOpen(true) }}><Plus size={16} /> {t('products.add')}</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
          <input className="w-full rounded-2xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 pl-9 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" placeholder={t('products.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="sm:w-56" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">{t('products.allCategories')}</option>
          {cats?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card>
          <EmptyState icon={<Package size={24} />} title={t('products.empty')} description={t('products.emptyHint')} action={<Button onClick={() => setOpen(true)}>{t('products.add')}</Button>} />
        </Card>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full text-sm table-row-hover">
              <thead className="bg-ink-50 dark:bg-ink-950 text-ink-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{t('products.table.product')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('products.table.sku')}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t('products.table.price')}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t('products.table.tax')}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t('products.table.stock')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('products.table.status')}</th>
                  <th className="text-right px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const stock = p.inventory ? Number(p.inventory.quantity_on_hand) : null
                  const low = stock != null && p.low_stock_threshold != null && stock <= Number(p.low_stock_threshold)
                  return (
                    <tr key={p.id} className="border-t border-ink-100 dark:border-ink-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={mediaUrl(p.image_url)} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                              {p.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            {p.barcode && <div className="text-[11px] text-slate-400">{p.barcode}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-500">{p.sku || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(p.price)}</td>
                      <td className="px-4 py-3 text-right">{Number(p.tax_rate)}%</td>
                      <td className={`px-4 py-3 text-right font-medium ${low ? 'text-amber-600' : ''}`}>
                        {stock == null ? '-' : `${stock} ${p.unit}`}
                      </td>
                      <td className="px-4 py-3"><Badge tone={p.is_active ? 'success' : 'neutral'}>{p.is_active ? t('common.active') : t('common.off')}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>{t('common.edit')}</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-ink-100 dark:border-ink-800 text-xs text-ink-500">
            {t('products.countLabel', { count: data.meta.total })}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('products.addTitle')} subtitle={t('products.addSubtitle')} wide>
        {formFields}
        {error && <div className="mt-4"><Alert tone="danger">{error}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button disabled={!form.name || !form.price || createMut.isPending} onClick={() => { setError(''); createMut.mutate() }}>{t('products.save')}</Button>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={t('products.editTitle')} subtitle={edit?.name} wide>
        {formFields}
        {error && <div className="mt-4"><Alert tone="danger">{error}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>{t('common.cancel')}</Button>
          <Button disabled={updateMut.isPending} onClick={() => { setError(''); updateMut.mutate() }}>{t('products.update')}</Button>
        </div>
      </Modal>
    </div>
  )
}
