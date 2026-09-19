import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg, type Category, type Page } from '@/lib/api'
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, Textarea } from '@/components/ui'
import { Plus, Tags } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/i18n/useT'

export default function CategoriesPage() {
  const orgId = useAuthStore((s) => s.organizationId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#338bff')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const t = useT()

  const { data, isLoading } = useQuery({
    queryKey: ['categories', orgId],
    enabled: !!orgId,
    queryFn: async () => (await api.get<Page<Category>>('/catalog/categories', { params: { page_size: 200 } })).data,
  })

  const createMut = useMutation({
    mutationFn: async () => (await api.post('/catalog/categories', { name, color, description: description || null })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      setName('')
      setDescription('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  if (!orgId) {
    return <Card><EmptyState title={t('empty.selectOrgFirst')} /></Card>
  }

  return (
    <div>
      <PageHeader
        breadcrumb={t('categories.breadcrumb')}
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        actions={<Button onClick={() => { setError(''); setOpen(true) }}><Plus size={16} /> {t('categories.add')}</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : !data?.items?.length ? (
        <Card>
          <EmptyState icon={<Tags size={24} />} title={t('categories.empty')} action={<Button onClick={() => setOpen(true)}>{t('categories.createOne')}</Button>} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((c) => (
            <div key={c.id} className="premium-card p-5 flex items-start gap-4 hover:-translate-y-0.5 transition">
              <div className="h-14 w-14 rounded-2xl shadow-inner shrink-0" style={{ background: c.color || '#338bff' }} />
              <div className="min-w-0">
                <div className="font-bold truncate">{c.name}</div>
                <div className="text-xs text-ink-400 mt-0.5 truncate">{c.slug}</div>
                {c.description && <p className="text-xs text-ink-500 mt-2 line-clamp-2">{c.description}</p>}
                <div className="mt-2"><Badge tone={c.is_active ? 'success' : 'neutral'}>{c.is_active ? t('common.active') : t('common.off')}</Badge></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('categories.newTitle')}>
        <div className="space-y-4">
          <Input label={t('categories.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('categories.namePlaceholder')} />
          <Input label={t('categories.colorLabel')} type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <Textarea label={t('categories.descriptionLabel')} value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <Alert tone="danger">{error}</Alert>}
          <Button className="w-full" disabled={!name || createMut.isPending} onClick={() => { setError(''); createMut.mutate() }}>{t('categories.create')}</Button>
        </div>
      </Modal>
    </div>
  )
}
