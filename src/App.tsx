import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './shared/i18n';
import './shared/styles/global.css';

import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Layout } from './shared/ui/Layout';

import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ProductPage } from './features/catalog/ProductPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { CartPage } from './features/cart/CartPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { ConfirmOrderPage } from './features/checkout/ConfirmOrderPage';
import { OrderDetailPage, OrdersListPage } from './features/checkout/OrderPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              {/* Default redirect to Catalog */}
              <Route index element={<Navigate to="/catalog" replace />} />

              {/* FE-001 & FE-002: Auth Screens */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* FE-003 & FE-007: Public Catalog & Product Detail */}
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />

              {/* FE-004: Protected Profile & Addresses */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* FE-005: Protected Server Cart */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                }
              />

              {/* FE-006: Protected Checkout, Payment Code Confirmation, Orders */}
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout/confirm/:orderId"
                element={
                  <ProtectedRoute>
                    <ConfirmOrderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/catalog" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
