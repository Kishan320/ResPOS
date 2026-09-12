import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import OrganizationsPage from '@/pages/OrganizationsPage'
import ProductsPage from '@/pages/ProductsPage'
import CategoriesPage from '@/pages/CategoriesPage'
import InventoryPage from '@/pages/InventoryPage'
import PosPage from '@/pages/PosPage'
import OrdersPage from '@/pages/OrdersPage'
import InvoicesPage from '@/pages/InvoicesPage'
import TerminalsPage from '@/pages/TerminalsPage'
import UsersPage from '@/pages/UsersPage'
import CustomersPage from '@/pages/CustomersPage'
import ReportsPage from '@/pages/ReportsPage'
import SettingsPage from '@/pages/SettingsPage'
import RestaurantOpsPage from '@/pages/RestaurantOpsPage'
import CmsAdminPage from '@/pages/CmsAdminPage'
import RbacPage from '@/pages/RbacPage'
import CurrencyPage from '@/pages/CurrencyPage'
import ReportHubPage from '@/pages/ReportHubPage'
import DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage from '@/pages/DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage'
import SuperAdminPlatformOperationsUserAndFullRbacManagementPage from '@/pages/SuperAdminPlatformOperationsUserAndFullRbacManagementPage'
import OrganizationOwnerAdminStaffUserCreationWithFullRbacPermissionPage from '@/pages/OrganizationOwnerAdminStaffUserCreationWithFullRbacPermissionPage'
import SuperAdminContactLeadsPage from '@/pages/SuperAdminContactLeadsPage'
import { Component, type ErrorInfo, type ReactNode } from 'react'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 12_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }

  static getDerivedStateFromError(err: Error) {
    return { error: err?.message || 'Unexpected UI error' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('App crash:', err, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 560, margin: '40px auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>{this.state.error}</p>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '10px 16px',
              background: '#059669',
              color: '#fff',
              border: 0,
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => {
              this.setState({ error: null })
              window.location.assign('/app')
            }}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Protected({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  if (!token || !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  if (token && user) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />
            <Route
              path="/app"
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="pos" element={<PosPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="reports" element={<ReportHubPage />} />
              <Route path="reports-classic" element={<ReportsPage />} />
              <Route path="restaurant" element={<RestaurantOpsPage />} />
              <Route path="currency" element={<CurrencyPage />} />
              <Route path="cms" element={<CmsAdminPage />} />
              <Route path="rbac" element={<RbacPage />} />
              <Route
                path="dynamic-discount-promotion-coupon-seasonal-and-item-offer-management"
                element={<DynamicDiscountPromotionCouponSeasonalAndItemOfferManagementPage />}
              />
              <Route
                path="super-admin-platform-operations-user-and-full-rbac-management"
                element={<SuperAdminPlatformOperationsUserAndFullRbacManagementPage />}
              />
              <Route
                path="organization-owner-admin-staff-user-creation-with-full-rbac-permission"
                element={<OrganizationOwnerAdminStaffUserCreationWithFullRbacPermissionPage />}
              />
              <Route path="terminals" element={<TerminalsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="contact-messages" element={<SuperAdminContactLeadsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </QueryClientProvider>
  )
}
