import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PacksPage } from './pages/PacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PartnerDashboardPage } from './pages/PartnerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TourismPage } from './pages/TourismPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);
  return null;
}

export function App() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
        <ScrollToTop />
        <main className="flex-1 pb-28">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/listing/:id" element={<ListingDetailPage />} />
            <Route path="/packs" element={<PacksPage />} />
            <Route path="/pack/:id" element={<PackDetailPage />} />
            <Route path="/tourisme" element={<TourismPage />} />
            <Route path="/decouvrir" element={<TourismPage />} />
            <Route path="/panier" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            
            {/* Authentification & Tableaux de bord */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard/partner" element={<PartnerDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
        <Navbar />
      </div>
    </AuthProvider>
  );
}

export default App;
