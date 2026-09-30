import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicHeader } from './components/PublicHeader';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PacksPage } from './pages/PacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TourismPage } from './pages/TourismPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';

// Code-splitting : les dashboards lourds sont chargés à la demande (lazy loading)
const AdminDashboardPage = React.lazy(() =>
  import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage }))
);
const PartnerDashboardPage = React.lazy(() =>
  import('./pages/PartnerDashboardPage').then(m => ({ default: m.PartnerDashboardPage }))
);
const ClientDashboardPage = React.lazy(() =>
  import('./pages/ClientDashboardPage').then(m => ({ default: m.ClientDashboardPage }))
);

// Fallback de chargement pendant le téléchargement d'un chunk
function DashboardLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-foreground/60 font-medium">Chargement du tableau de bord…</p>
      </div>
    </div>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}

export function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');
  const isAuth = location.pathname === '/login' || location.pathname === '/register';
  const isHome = location.pathname === '/';
  const hidePublicChrome = isDashboard || isAuth;
  const showPublicHeader = !isHome && !hidePublicChrome;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
          <ScrollToTop />
          {showPublicHeader && <PublicHeader />}
          <main className={`flex-1 ${hidePublicChrome ? '' : 'pb-28'}`}>
            <Suspense fallback={<DashboardLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/residences" element={<ExplorePage />} />
                <Route path="/hebergements" element={<ExplorePage />} />
                <Route path="/vehicules" element={<ExplorePage />} />
                <Route path="/listing/:id" element={<ListingDetailPage />} />
                <Route path="/packs" element={<PacksPage />} />
                <Route path="/pack/:id" element={<PackDetailPage />} />
                <Route path="/decouvertes" element={<TourismPage />} />
                <Route path="/tourisme" element={<TourismPage />} />
                <Route path="/decouvrir" element={<TourismPage />} />
                <Route path="/panier" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                
                {/* Informations légales, Confidentialité & Utilisation */}
                <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/cgu" element={<TermsPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/conditions-utilisation" element={<TermsPage />} />
                
                {/* Authentification */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Tableaux de bord protégés */}
                <Route
                  path="/dashboard/client"
                  element={
                    <ProtectedRoute allowedRoles={['client']}>
                      <ClientDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/partner"
                  element={
                    <ProtectedRoute allowedRoles={['owner', 'partner']}>
                      <PartnerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'subadmin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          {!hidePublicChrome && <Footer />}
          {!hidePublicChrome && <Navbar />}
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

