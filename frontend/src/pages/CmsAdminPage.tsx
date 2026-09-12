import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, Input, PageHeader, Spinner, Textarea } from '@/components/ui'
import ImageUpload from '@/components/ImageUpload'
import { useAuthStore } from '@/store/authStore'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'

type Cms = {
  id?: number
  section_key: string
  title?: string
  subtitle?: string
  body?: string
  cta_label?: string
  cta_url?: string
  image_url?: string
  image_url_2?: string
  image_url_3?: string
  image_url_4?: string
  badge_text?: string
  extra_json?: Record<string, unknown> | null
  sort_order?: number
  is_active?: boolean
}

type Career = {
  id?: number
  title: string
  department?: string
  location?: string
  employment_type?: string
  description?: string
  requirements?: string
  apply_email?: string
  image_url?: string
  is_active?: boolean
}

type Social = {
  id?: number
  platform: string
  label: string
  url: string
  image_url?: string
  is_active?: boolean
}

type ContactField = {
  key: string
  label: string
  type: string
  required: boolean
  enabled: boolean
  placeholder: string
}

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

const DEFAULT_CONTACT_FIELDS: ContactField[] = [
  { key: 'name', label: 'Name', type: 'text', required: false, enabled: true, placeholder: 'Your full name' },
  { key: 'email', label: 'Email', type: 'email', required: true, enabled: true, placeholder: 'you@company.com' },
  { key: 'phone', label: 'Phone', type: 'tel', required: false, enabled: true, placeholder: '+971 ...' },
  {
    key: 'message',
    label: 'Message and requirements',
    type: 'textarea',
    required: false,
    enabled: true,
    placeholder: 'Tell us about your store and what you need',
  },
]

const SECTION_KEYS = [
  'hero',
  'stats',
  'about',
  'module_map',
  'features',
  'industries',
  'gallery',
  'mod_dashboard',
  'mod_pos',
  'mod_products',
  'mod_categories',
  'mod_inventory',
  'mod_orders',
  'mod_invoices',
  'mod_reports',
  'reports',
  'mod_discounts',
  'mod_restaurant',
  'mod_terminals',
  'mod_customers',
  'mod_staff',
  'mod_users',
  'mod_currency',
  'mod_organizations',
  'mod_cms',
  'mod_rbac',
  'mod_platform_users',
  'mod_settings',
  'journey',
  'why_us',
  'how_it_works',
  'testimonials',
  'faqs',
  'careers_banner',
  'contact',
  'cta',
  'footer',
]

function parseContactFields(extra: Record<string, unknown> | null | undefined): ContactField[] {
  const raw = extra?.fields
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_CONTACT_FIELDS.map((f) => ({ ...f }))
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      key: String(f.key || '').trim(),
      label: String(f.label || f.key || 'Field'),
      type: String(f.type || 'text'),
      required: f.key === 'email' ? true : Boolean(f.required),
      enabled: f.enabled !== false,
      placeholder: String(f.placeholder || ''),
    }))
    .filter((f) => f.key)
}

export default function CmsAdminPage() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<'landing' | 'careers' | 'social' | 'contact_form' | 'contact_leads'>(
    'landing'
  )
  const [section, setSection] = useState<Cms>({ section_key: 'hero' })
  const [extraJsonText, setExtraJsonText] = useState('{}')
  const [career, setCareer] = useState<Career>({ title: '' })
  const [social, setSocial] = useState<Social>({ platform: 'linkedin', label: '', url: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [contactFilter, setContactFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [contactMeta, setContactMeta] = useState({
    title: 'Contact us',
    subtitle: 'Share your name, email and requirements.',
    body: '',
    badge_text: 'Contact',
    cta_label: 'Open contact form',
    submit_label: 'Send message',
    success_message: 'Thank you. Your message was received and our team will contact you soon.',
    show_on_landing: true,
    is_active: true,
    sort_order: 95,
  })
  const [contactFields, setContactFields] = useState<ContactField[]>(DEFAULT_CONTACT_FIELDS.map((f) => ({ ...f })))
  const qc = useQueryClient()

  if (user?.role !== 'super_admin') return <Navigate to="/app" replace />

  const sections = useQuery({
    queryKey: ['cms-sections'],
    queryFn: async () => (await api.get<Cms[]>('/cms/sections')).data,
  })
  const careers = useQuery({
    queryKey: ['cms-careers'],
    queryFn: async () => (await api.get<Career[]>('/cms/careers')).data,
  })
  const socials = useQuery({
    queryKey: ['cms-social'],
    queryFn: async () => (await api.get<Social[]>('/cms/social')).data,
  })
  const contacts = useQuery({
    queryKey: ['cms-contacts', contactFilter],
    queryFn: async () => {
      const q = contactFilter === 'all' ? '' : `?status=${contactFilter}`
      return (await api.get<ContactLead[]>(`/cms/contacts${q}`)).data
    },
    enabled: tab === 'contact_leads',
  })

  useEffect(() => {
    const found = sections.data?.find((s) => s.section_key === section.section_key)
    if (found) {
      setSection(found)
      setExtraJsonText(JSON.stringify(found.extra_json || {}, null, 2))
    } else {
      setExtraJsonText('{}')
    }
  }, [sections.data, section.section_key])

  useEffect(() => {
    const found = sections.data?.find((s) => s.section_key === 'contact')
    if (!found) return
    const extra = (found.extra_json || {}) as Record<string, unknown>
    setContactMeta({
      title: found.title || 'Contact us',
      subtitle: found.subtitle || '',
      body: found.body || '',
      badge_text: found.badge_text || 'Contact',
      cta_label: found.cta_label || 'Open contact form',
      submit_label: String(extra.submit_label || 'Send message'),
      success_message: String(
        extra.success_message || 'Thank you. Your message was received and our team will contact you soon.'
      ),
      show_on_landing: extra.show_on_landing !== false,
      is_active: found.is_active !== false,
      sort_order: found.sort_order ?? 95,
    })
    setContactFields(parseContactFields(extra))
  }, [sections.data])

  const saveSection = useMutation({
    mutationFn: async () => {
      let extra: Record<string, unknown> | null = null
      try {
        extra = extraJsonText.trim() ? JSON.parse(extraJsonText) : null
      } catch {
        throw new Error('extra_json must be valid JSON (lists for FAQs, features, etc.)')
      }
      return (await api.post('/cms/sections', { ...section, extra_json: extra })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-sections'] })
      qc.invalidateQueries({ queryKey: ['cms-public'] })
      setMsg('Landing section saved - public site updates live')
      setError('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  const saveCareer = useMutation({
    mutationFn: async () =>
      career.id
        ? (await api.patch(`/cms/careers/${career.id}`, career)).data
        : (await api.post('/cms/careers', career)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-careers'] })
      setCareer({ title: '' })
      setMsg('Career saved')
    },
    onError: (e) => setError(errMsg(e)),
  })

  const saveSocial = useMutation({
    mutationFn: async () =>
      social.id
        ? (await api.patch(`/cms/social/${social.id}`, social)).data
        : (await api.post('/cms/social', social)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-social'] })
      setSocial({ platform: 'linkedin', label: '', url: '' })
      setMsg('Social link saved')
    },
    onError: (e) => setError(errMsg(e)),
  })

  const saveContactForm = useMutation({
    mutationFn: async () => {
      const fields = contactFields
        .map((f) => ({
          ...f,
          key: f.key.trim(),
          required: f.key.trim() === 'email' ? true : f.required,
          enabled: f.enabled,
        }))
        .filter((f) => f.key)
      if (!fields.some((f) => f.key === 'email' && f.enabled !== false)) {
        throw new Error('Email field must exist and stay enabled (required for contact leads).')
      }
      const payload: Cms = {
        section_key: 'contact',
        title: contactMeta.title,
        subtitle: contactMeta.subtitle,
        body: contactMeta.body,
        badge_text: contactMeta.badge_text,
        cta_label: contactMeta.cta_label,
        sort_order: contactMeta.sort_order,
        is_active: contactMeta.is_active,
        extra_json: {
          show_on_landing: contactMeta.show_on_landing,
          submit_label: contactMeta.submit_label,
          success_message: contactMeta.success_message,
          fields,
        },
      }
      return (await api.post('/cms/sections', payload)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-sections'] })
      qc.invalidateQueries({ queryKey: ['cms-public'] })
      setMsg('Contact form CMS saved - landing form updates live')
      setError('')
    },
    onError: (e) => setError(errMsg(e)),
  })

  const resolveContact = useMutation({
    mutationFn: async (args: { id: number; is_resolved: boolean; admin_note?: string }) =>
      (
        await api.patch(`/cms/contacts/${args.id}`, {
          is_resolved: args.is_resolved,
          admin_note: args.admin_note,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-contacts'] })
      setMsg('Contact updated')
    },
    onError: (e) => setError(errMsg(e)),
  })

  const deleteContact = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/cms/contacts/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-contacts'] })
      setMsg('Contact deleted')
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
        breadcrumb="Super admin · CMS"
        title="CMS control center"
        subtitle="Landing page, contact form fields, contact leads, careers and social - fully customizable."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['landing', 'Landing sections'],
            ['contact_form', 'Contact form CMS'],
            ['contact_leads', 'Contact leads'],
            ['careers', 'Careers'],
            ['social', 'Social media'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k)
              setMsg('')
              setError('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold border ${
              tab === k ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

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

      {tab === 'landing' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Sections">
            {sections.isLoading ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {SECTION_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      const found = sections.data?.find((s) => s.section_key === k)
                      const next = found || { section_key: k, title: '', subtitle: '', body: '' }
                      setSection(next)
                      setExtraJsonText(JSON.stringify(next.extra_json || {}, null, 2))
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm font-bold border ${
                      section.section_key === k
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-slate-200'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card className="lg:col-span-2" title={`Edit · ${section.section_key}`} subtitle="All fields optional except key">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Title" value={section.title || ''} onChange={(e) => setSection({ ...section, title: e.target.value })} />
              <Input label="Badge" value={section.badge_text || ''} onChange={(e) => setSection({ ...section, badge_text: e.target.value })} />
              <div className="sm:col-span-2">
                <Input label="Subtitle" value={section.subtitle || ''} onChange={(e) => setSection({ ...section, subtitle: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Textarea label="Body" value={section.body || ''} onChange={(e) => setSection({ ...section, body: e.target.value })} />
              </div>
              <Input label="CTA label" value={section.cta_label || ''} onChange={(e) => setSection({ ...section, cta_label: e.target.value })} />
              <Input label="CTA URL" value={section.cta_url || ''} onChange={(e) => setSection({ ...section, cta_url: e.target.value })} />
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                <ImageUpload label="Image 1" entity="cms" value={section.image_url} onChange={(u) => setSection({ ...section, image_url: u || undefined })} />
                <ImageUpload label="Image 2" entity="cms" value={section.image_url_2} onChange={(u) => setSection({ ...section, image_url_2: u || undefined })} />
                <ImageUpload label="Image 3" entity="cms" value={section.image_url_3} onChange={(u) => setSection({ ...section, image_url_3: u || undefined })} />
                <ImageUpload label="Image 4" entity="cms" value={section.image_url_4} onChange={(u) => setSection({ ...section, image_url_4: u || undefined })} />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Structured lists (JSON) - FAQs, features, industries, testimonials, steps, contact fields"
                  value={extraJsonText}
                  onChange={(e) => setExtraJsonText(e.target.value)}
                  className="min-h-[180px] font-mono text-xs"
                />
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Prefer the Contact form CMS tab for field labels, required flags and submit text.
                </p>
              </div>
              <Input
                label="Sort order"
                type="number"
                value={String(section.sort_order ?? 0)}
                onChange={(e) => setSection({ ...section, sort_order: Number(e.target.value) || 0 })}
              />
            </div>
            <Button className="mt-4" disabled={saveSection.isPending} onClick={() => saveSection.mutate()}>
              Save section
            </Button>
          </Card>
        </div>
      )}

      {tab === 'contact_form' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Contact section text" subtitle="Shown above the landing contact form">
            <div className="space-y-3">
              <Input label="Badge" value={contactMeta.badge_text} onChange={(e) => setContactMeta({ ...contactMeta, badge_text: e.target.value })} />
              <Input label="Title" value={contactMeta.title} onChange={(e) => setContactMeta({ ...contactMeta, title: e.target.value })} />
              <Input label="Subtitle" value={contactMeta.subtitle} onChange={(e) => setContactMeta({ ...contactMeta, subtitle: e.target.value })} />
              <Textarea label="Body" value={contactMeta.body} onChange={(e) => setContactMeta({ ...contactMeta, body: e.target.value })} />
              <Input label="Open form button label" value={contactMeta.cta_label} onChange={(e) => setContactMeta({ ...contactMeta, cta_label: e.target.value })} />
              <Input label="Submit button label" value={contactMeta.submit_label} onChange={(e) => setContactMeta({ ...contactMeta, submit_label: e.target.value })} />
              <Textarea label="Success message" value={contactMeta.success_message} onChange={(e) => setContactMeta({ ...contactMeta, success_message: e.target.value })} />
              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contactMeta.show_on_landing}
                    onChange={(e) => setContactMeta({ ...contactMeta, show_on_landing: e.target.checked })}
                  />
                  Show on landing page
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contactMeta.is_active}
                    onChange={(e) => setContactMeta({ ...contactMeta, is_active: e.target.checked })}
                  />
                  Form active
                </label>
              </div>
            </div>
          </Card>

          <Card title="Dynamic form fields" subtitle="Enable, rename, require, reorder, add custom fields">
            <div className="space-y-3">
              {contactFields.map((f, idx) => (
                <div key={`${f.key}-${idx}`} className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50/60">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input
                      label="Field key"
                      value={f.key}
                      onChange={(e) => {
                        const next = [...contactFields]
                        next[idx] = { ...f, key: e.target.value, required: e.target.value.trim() === 'email' ? true : f.required }
                        setContactFields(next)
                      }}
                    />
                    <Input
                      label="Label"
                      value={f.label}
                      onChange={(e) => {
                        const next = [...contactFields]
                        next[idx] = { ...f, label: e.target.value }
                        setContactFields(next)
                      }}
                    />
                    <label className="text-xs font-bold text-slate-600">
                      Type
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white"
                        value={f.type}
                        onChange={(e) => {
                          const next = [...contactFields]
                          next[idx] = { ...f, type: e.target.value }
                          setContactFields(next)
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="textarea">Textarea</option>
                        <option value="number">Number</option>
                      </select>
                    </label>
                    <Input
                      label="Placeholder"
                      value={f.placeholder}
                      onChange={(e) => {
                        const next = [...contactFields]
                        next[idx] = { ...f, placeholder: e.target.value }
                        setContactFields(next)
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.enabled}
                        onChange={(e) => {
                          if (f.key === 'email' && !e.target.checked) return
                          const next = [...contactFields]
                          next[idx] = { ...f, enabled: e.target.checked }
                          setContactFields(next)
                        }}
                      />
                      Enabled
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.key === 'email' ? true : f.required}
                        disabled={f.key === 'email'}
                        onChange={(e) => {
                          const next = [...contactFields]
                          next[idx] = { ...f, required: e.target.checked }
                          setContactFields(next)
                        }}
                      />
                      Required {f.key === 'email' ? '(always)' : ''}
                    </label>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 text-rose-600 font-bold text-xs"
                      onClick={() => {
                        if (f.key === 'email') return
                        setContactFields(contactFields.filter((_, i) => i !== idx))
                      }}
                      disabled={f.key === 'email'}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  setContactFields([
                    ...contactFields,
                    {
                      key: `custom_${contactFields.length + 1}`,
                      label: 'Custom field',
                      type: 'text',
                      required: false,
                      enabled: true,
                      placeholder: '',
                    },
                  ])
                }
              >
                <Plus size={16} /> Add field
              </Button>
              <Button className="w-full" disabled={saveContactForm.isPending} onClick={() => saveContactForm.mutate()}>
                Save contact form CMS
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'contact_leads' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            {(['open', 'resolved', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setContactFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-bold border capitalize ${
                  contactFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-sm font-semibold text-slate-500 ml-2">
              {contactFilter === 'open' ? `${openCount} open` : `${contacts.data?.length || 0} shown`}
            </span>
          </div>
          <Card title="Contact submissions" subtitle="Super admin only - mark resolved after follow-up">
            {contacts.isLoading ? (
              <Spinner />
            ) : (contacts.data || []).length === 0 ? (
              <p className="text-sm font-medium text-slate-500">No contact messages yet.</p>
            ) : (
              <div className="space-y-3">
                {(contacts.data || []).map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-4 ${
                      c.is_resolved ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{c.name || 'No name'} · {c.email}</div>
                        <div className="text-xs font-semibold text-slate-500 mt-1">
                          {c.phone || 'No phone'} · {c.created_at ? new Date(c.created_at).toLocaleString() : ''} ·{' '}
                          <span className={c.is_resolved ? 'text-slate-500' : 'text-emerald-700'}>{c.status}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!c.is_resolved ? (
                          <Button
                            size="sm"
                            onClick={() => resolveContact.mutate({ id: c.id, is_resolved: true })}
                            disabled={resolveContact.isPending}
                          >
                            <CheckCircle2 size={14} /> Mark resolved
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => resolveContact.mutate({ id: c.id, is_resolved: false })}
                            disabled={resolveContact.isPending}
                          >
                            Reopen
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm('Delete this contact message?')) deleteContact.mutate(c.id)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {c.message && (
                      <p className="mt-3 text-sm font-medium text-slate-700 whitespace-pre-wrap">{c.message}</p>
                    )}
                    {c.payload_json && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer font-bold">All submitted fields</summary>
                        <pre className="mt-2 overflow-auto rounded-xl bg-white border border-slate-100 p-2">
                          {JSON.stringify(c.payload_json, null, 2)}
                        </pre>
                      </details>
                    )}
                    {c.admin_note && (
                      <p className="mt-2 text-xs font-semibold text-slate-500">Note: {c.admin_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'careers' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="New / edit role">
            <div className="space-y-3">
              <Input label="Title *" value={career.title} onChange={(e) => setCareer({ ...career, title: e.target.value })} />
              <Input label="Department" value={career.department || ''} onChange={(e) => setCareer({ ...career, department: e.target.value })} />
              <Input label="Location" value={career.location || ''} onChange={(e) => setCareer({ ...career, location: e.target.value })} />
              <Input label="Type" value={career.employment_type || ''} onChange={(e) => setCareer({ ...career, employment_type: e.target.value })} />
              <Textarea label="Description" value={career.description || ''} onChange={(e) => setCareer({ ...career, description: e.target.value })} />
              <Textarea label="Requirements" value={career.requirements || ''} onChange={(e) => setCareer({ ...career, requirements: e.target.value })} />
              <Input label="Apply email" value={career.apply_email || ''} onChange={(e) => setCareer({ ...career, apply_email: e.target.value })} />
              <ImageUpload label="Role image" entity="cms" value={career.image_url} onChange={(u) => setCareer({ ...career, image_url: u || undefined })} />
              <Button disabled={!career.title || saveCareer.isPending} onClick={() => saveCareer.mutate()}>
                Save career
              </Button>
            </div>
          </Card>
          <Card title="Published roles">
            {careers.isLoading ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {(careers.data || []).map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-orange-400"
                    onClick={() => setCareer(c)}
                  >
                    <div className="font-bold">{c.title}</div>
                    <div className="text-xs text-slate-500">
                      {c.department} · {c.location}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'social' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Add / edit social">
            <div className="space-y-3">
              <Input label="Platform" value={social.platform} onChange={(e) => setSocial({ ...social, platform: e.target.value })} />
              <Input label="Label" value={social.label} onChange={(e) => setSocial({ ...social, label: e.target.value })} />
              <Input label="URL" value={social.url} onChange={(e) => setSocial({ ...social, url: e.target.value })} />
              <ImageUpload label="Icon/image" entity="cms" value={social.image_url} onChange={(u) => setSocial({ ...social, image_url: u || undefined })} />
              <Button disabled={!social.url || !social.label || saveSocial.isPending} onClick={() => saveSocial.mutate()}>
                Save social
              </Button>
            </div>
          </Card>
          <Card title="Links">
            <div className="space-y-2">
              {(socials.data || []).map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left rounded-xl border border-slate-200 p-3"
                  onClick={() => setSocial(s)}
                >
                  <div className="font-bold">{s.label}</div>
                  <div className="text-xs text-slate-500 truncate">{s.url}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
