import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, Input, PageHeader } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Shield, Palette, Building2 } from 'lucide-react'

export default function SettingsPage() {
  const { user, theme, setTheme, organizationId, organizationName, logout } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const pwdMut = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })).data,
    onSuccess: () => {
      setMsg('Password updated successfully')
      setError('')
      setCurrentPassword('')
      setNewPassword('')
    },
    onError: (e) => {
      setMsg('')
      setError(errMsg(e))
    },
  })

  return (
    <div>
      <PageHeader breadcrumb="Account" title="Settings" subtitle="Profile security, theme, and tenant context." />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Profile" subtitle="Signed-in identity">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-500">Name</span><span className="font-semibold">{user?.full_name}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-500">Username</span><span className="font-mono font-semibold">{user?.username}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-500">Email</span><span className="font-semibold">{user?.email}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Role</span><span className="font-semibold capitalize">{String(user?.role || '').replace(/_/g, ' ')}</span></div>
          </div>
        </Card>

        <Card title="Active tenant" subtitle="Organization context for catalog & POS">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <div className="font-bold text-lg">{organizationName || (organizationId ? `Organization #${organizationId}` : 'None selected')}</div>
              <p className="text-sm text-ink-500 mt-1">
                Super admins switch tenants from Organizations. Org users are locked to their shop.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Appearance" subtitle="Light / dark theme">
          <div className="flex items-center gap-3">
            <Palette className="text-brand-600" size={20} />
            <div className="flex gap-2">
              <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>Light</Button>
              <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>Dark</Button>
            </div>
          </div>
        </Card>

        <Card title="Security" subtitle="Change your password">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
              <Shield size={16} /> Keep credentials private on shared counters
            </div>
            <Input label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {msg && <Alert tone="success">{msg}</Alert>}
            {error && <Alert tone="danger">{error}</Alert>}
            <Button disabled={pwdMut.isPending || !currentPassword || newPassword.length < 6} onClick={() => pwdMut.mutate()}>
              Update password
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-4" title="Session">
        <Button variant="danger" onClick={() => { logout(); window.location.href = '/login' }}>
          Sign out of Rathin POS
        </Button>
      </Card>
    </div>
  )
}
