/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { TopInfoStrip } from './components/TopInfoStrip';
import { Header } from './components/Header';
import { VerticalDock } from './components/VerticalDock';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage, ShippingPage, ReturnsPage, PrivacyPage, TermsPage } from './pages/StaticPolicyPages';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboard } from './pages/AdminDashboard';

const AppContent: React.FC = () => {
  const { currentPage, isWishlistDrawerOpen, setIsWishlistDrawerOpen } = useShop();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'shop':
        return <ShopPage />;
      case 'men':
        return <ShopPage forcedCategory="men" />;
      case 'women':
        return <ShopPage forcedCategory="women" />;
      case 'watches':
        return <ShopPage forcedCategory="watches" />;
      case 'new-arrivals':
        return <ShopPage filterType="new" />;
      case 'best-sellers':
        return <ShopPage filterType="bestseller" />;
      case 'offers':
        return <ShopPage filterType="offer" />;
      case 'product-detail':
        return <ProductDetailPage />;
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'order-confirmation':
        return <OrderConfirmationPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'faq':
        return <FAQPage />;
      case 'shipping':
        return <ShippingPage />;
      case 'returns':
        return <ReturnsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'terms':
        return <TermsPage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'forgot-password':
        return <ForgotPasswordPage />;
      case 'account':
        return <AccountPage initialTab="profile" />;
      case 'orders':
        return <AccountPage initialTab="orders" />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-neutral-100 flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
      {/* 1. Slim Top Information Strip */}
      <TopInfoStrip />

      {/* 2. Main Logo & Navigation Header */}
      <Header
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
      />

      {/* 3. Vertical Left-Side Desktop Navigation Dock (macOS Dock inspired) */}
      <VerticalDock />

      {/* Mobile Drawer & Mobile Bottom Nav */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />
      <MobileBottomNav onOpenSearch={() => setIsSearchModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16 lg:pb-0 xl:pl-24 xl:pr-6">
        {renderCurrentPage()}
      </main>

      {/* 10. Professional Luxury Footer */}
      <Footer />

      {/* Global Overlays & Modals */}
      <CartDrawer />
      <WishlistDrawer
        isOpen={isWishlistDrawerOpen}
        onClose={() => setIsWishlistDrawerOpen(false)}
      />
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <AppContent />
    </ShopProvider>
  );
}
