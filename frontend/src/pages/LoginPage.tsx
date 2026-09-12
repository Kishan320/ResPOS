import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errMsg, type User } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Alert, Button } from '@/components/ui'
import BrandLogo from '@/components/BrandLogo'
import { Lock, User as UserIcon } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setSession = useAuthStore((s) => s.setSession)
  const setOrganization = useAuthStore((s) => s.setOrganization)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { username, password })
      const user = data.user as User
      if (!data?.tokens?.access_token || !user?.id) {
        throw new Error('Invalid login response from server')
      }
      setSession(data.tokens.access_token, data.tokens.refresh_token, user)
      if (user.organization_id) setOrganization(user.organization_id)
      window.location.assign('/app')
    } catch (err) {
      setError(errMsg(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full min-h-dvh grid lg:grid-cols-2 overflow-x-clip">
      <div className="relative hidden lg:block overflow-hidden bg-slate-950">
        <img src="/landing/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <BrandLogo to="/" height={36} maxWidth={150} surface="dark" />
          <div>
            <p className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-3">Rathin POS</p>
            <h1 className="text-4xl font-extrabold leading-tight max-w-md tracking-tight">
              Built for your organization - restaurants, grocery and retail
            </h1>
            <p className="mt-4 text-slate-300 font-medium max-w-md leading-relaxed">
              Organization admins run POS, inventory, staff, discounts and 30 reports for their store.
              Sign in with your org credentials to manage day-to-day operations.
            </p>
          </div>
          <p className="text-sm text-slate-400 font-medium">Organization-first · multi-store ready · AED base</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-[#f6f7f9] safe-pt safe-pb">
        <form onSubmit={onSubmit} className="w-full max-w-[400px] space-y-5 sm:space-y-6 animate-fade-up">
          <div>
            <div className="lg:hidden mb-6">
              <BrandLogo to="/" height={32} maxWidth={140} surface="light" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium mt-1 text-sm">Sign in with username or email</p>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <label className="block">
              <span className="field-label">Username or email</span>
              <div className="relative">
                <UserIcon className="field-icon-left" size={17} aria-hidden />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="field-control has-icon-left"
                  placeholder="Username or email"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="field-label">Password</span>
              <div className="relative">
                <Lock className="field-icon-left" size={17} aria-hidden />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-control has-icon-left"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Continue to dashboard'}
            </Button>
          </div>

          <p className="text-center text-sm font-semibold">
            <Link to="/" className="text-emerald-700 hover:text-emerald-600">
              ← Back to home
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
