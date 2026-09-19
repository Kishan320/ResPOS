import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, errMsg } from '@/lib/api'
import { Alert, Button, Card, Input, PageHeader } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { Shield, Palette, Building2 } from 'lucide-react'
import { useT, useTEnum } from '@/i18n/useT'

export default function SettingsPage() {
  const { user, theme, setTheme, organizationId, organizationName, logout } = useAuthStore()
  const t = useT()
  const tEnum = useTEnum()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const pwdMut = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })).data,
    onSuccess: () => {
      setMsg(t('settings.passwordUpdated'))
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
      <PageHeader breadcrumb={t('settings.breadcrumb')} title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={t('settings.profile')} subtitle={t('settings.profileSubtitle')}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-500">{t('settings.nameLabel')}</span><span className="font-semibold">{user?.full_name}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-500">{t('settings.usernameLabel')}</span><span className="font-mono font-semibold">{user?.username}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-500">{t('settings.emailLabel')}</span><span className="font-semibold">{user?.email}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">{t('settings.roleLabel')}</span><span className="font-semibold capitalize">{tEnum('roles', user?.role, String(user?.role || '').replace(/_/g, ' '))}</span></div>
          </div>
        </Card>

        <Card title={t('settings.activeTenant')} subtitle={t('settings.activeTenantSubtitle')}>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <div className="font-bold text-lg">{organizationName || (organizationId ? t('settings.orgNumber', { id: organizationId }) : t('settings.noOrgSelected'))}</div>
              <p className="text-sm text-ink-500 mt-1">
                {t('settings.tenantHint')}
              </p>
            </div>
          </div>
        </Card>

        <Card title={t('settings.appearance')} subtitle={t('settings.appearanceSubtitle')}>
          <div className="flex items-center gap-3">
            <Palette className="text-brand-600" size={20} />
            <div className="flex gap-2">
              <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>{t('settings.light')}</Button>
              <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>{t('settings.dark')}</Button>
            </div>
          </div>
        </Card>

        <Card title={t('settings.security')} subtitle={t('settings.securitySubtitle')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
              <Shield size={16} /> {t('settings.securityHint')}
            </div>
            <Input label={t('settings.currentPassword')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label={t('settings.newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {msg && <Alert tone="success">{msg}</Alert>}
            {error && <Alert tone="danger">{error}</Alert>}
            <Button disabled={pwdMut.isPending || !currentPassword || newPassword.length < 6} onClick={() => pwdMut.mutate()}>
              {t('settings.updatePassword')}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-4" title={t('settings.session')}>
        <Button variant="danger" onClick={() => { logout(); window.location.href = '/login' }}>
          {t('settings.signOut')}
        </Button>
      </Card>
    </div>
  )
}
