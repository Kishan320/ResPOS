import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'

type Theme = 'light' | 'dark'

type AuthState = {
  token: string | null
  refreshToken: string | null
  user: User | null
  organizationId: number | null
  organizationName: string | null
  theme: Theme
  sidebarCollapsed: boolean
  setSession: (token: string, refresh: string, user: User) => void
  setOrganization: (id: number | null, name?: string | null) => void
  setTheme: (theme: Theme) => void
  setSidebarCollapsed: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      organizationId: null,
      organizationName: null,
      theme: 'light',
      sidebarCollapsed: false,
      setSession: (token, refreshToken, user) => {
        // Org users always lock to their tenant. Super admin keeps last selected tenant if any.
        const isSuper = user.role === 'super_admin'
        const nextOrgId = user.organization_id ?? (isSuper ? get().organizationId : null)
        set({
          token,
          refreshToken,
          user,
          organizationId: nextOrgId,
          organizationName: user.organization_id
            ? get().organizationName
            : isSuper
              ? get().organizationName
              : null,
        })
      },
      setOrganization: (id, name = null) => set({ organizationId: id, organizationName: name }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme || 'light')
        set({ theme })
      },
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          organizationId: null,
          organizationName: null,
        }),
    }),
    { name: 'pos-auth-v2' }
  )
)
