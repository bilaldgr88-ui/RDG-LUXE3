import React from 'react';
import { useShop } from '../context/ShopContext';
import { PageView } from '../types';
import {
  X,
  Home,
  LayoutGrid,
  User,
  Sparkles,
  Watch,
  Tag,
  Info,
  Mail,
  HelpCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  FileText,
  Shield,
  ShoppingBag,
  LogIn,
  LogOut,
  Package,
} from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSearch,
}) => {
  const { currentPage, setCurrentPage, user, logout, cart, setIsCartDrawerOpen } = useShop();

  if (!isOpen) return null;

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-sm bg-[#0C0C0F] border-r border-[#26262E] h-full flex flex-col justify-between overflow-y-auto p-6 z-10 shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#202026]">
            <div className="flex items-center gap-2.5">
              <img
                src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
                alt="RGD Emblem"
                className="w-8 h-8 rounded-full border border-[#D4AF37]/60"
              />
              <span className="font-brand font-bold text-lg text-gold-gradient tracking-widest">
                RGD LUXE
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="p-2 text-neutral-400 hover:text-white rounded-full bg-[#18181D]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Shortcut */}
          <div className="mt-5">
            <button
              onClick={() => {
                onClose();
                onOpenSearch();
              }}
              className="w-full py-2.5 px-4 bg-[#141419] border border-[#2B2B33] rounded-xl text-left text-xs text-neutral-400 flex items-center justify-between hover:border-[#D4AF37]/50"
            >
              <span>Search fashion & watches...</span>
              <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">
                Explore
              </span>
            </button>
          </div>

          {/* Primary Collections */}
          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold mb-2 px-1">
              Main Catalog
            </div>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => navigateTo('home')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'home'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Home className="w-4 h-4 text-[#D4AF37]" />
                <span>Home Showcase</span>
              </button>
              <button
                onClick={() => navigateTo('shop')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'shop'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#D4AF37]" />
                <span>Shop All Creations</span>
              </button>
              <button
                onClick={() => navigateTo('men')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'men'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span>Men's Tailoring</span>
              </button>
              <button
                onClick={() => navigateTo('women')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'women'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Women's Couture</span>
              </button>
              <button
                onClick={() => navigateTo('watches')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'watches'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Watch className="w-4 h-4 text-[#D4AF37]" />
                <span>Luxury Watches</span>
              </button>
              <button
                onClick={() => navigateTo('new-arrivals')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'new-arrivals'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#D4AF37]" />
                <span>New Arrivals</span>
              </button>
              <button
                onClick={() => navigateTo('best-sellers')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'best-sellers'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Best Sellers</span>
              </button>
              <button
                onClick={() => navigateTo('offers')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  currentPage === 'offers'
                    ? 'bg-[#D4AF37]/15 text-[#E6C25B] font-semibold'
                    : 'text-neutral-300 hover:bg-[#16161D]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#D4AF37]" />
                <span>Special Offers</span>
              </button>
            </nav>
          </div>

          {/* Brand & Policies */}
          <div className="mt-6 pt-4 border-t border-[#1C1C22]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-2 px-1">
              Maison & Services
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <button
                onClick={() => navigateTo('about')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <Info className="w-3.5 h-3.5 text-neutral-500" />
                <span>About Us</span>
              </button>
              <button
                onClick={() => navigateTo('contact')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <Mail className="w-3.5 h-3.5 text-neutral-500" />
                <span>Contact Us</span>
              </button>
              <button
                onClick={() => navigateTo('faq')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                <span>FAQ</span>
              </button>
              <button
                onClick={() => navigateTo('shipping')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <Truck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Shipping</span>
              </button>
              <button
                onClick={() => navigateTo('returns')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                <span>Returns</span>
              </button>
              <button
                onClick={() => navigateTo('privacy')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Privacy</span>
              </button>
              <button
                onClick={() => navigateTo('terms')}
                className="flex items-center gap-2 py-2 px-2 text-neutral-400 hover:text-white text-left col-span-2"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Terms & Conditions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-[#202026] flex flex-col gap-2">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-neutral-300 bg-[#16161D] p-3 rounded-lg border border-[#262630]">
                <div>
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="text-[11px] text-neutral-400">{user.email}</div>
                </div>
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigateTo('admin')}
                    className="p-1.5 bg-[#D4AF37]/20 text-[#D4AF37] rounded-md hover:bg-[#D4AF37] hover:text-black transition-colors"
                    title="Admin Panel"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateTo('account')}
                  className="flex-1 py-2 text-xs bg-[#22222B] hover:bg-[#2C2C36] text-white rounded-lg font-medium text-center"
                >
                  My Account
                </button>
                <button
                  onClick={() => navigateTo('orders')}
                  className="flex-1 py-2 text-xs bg-[#1A1A22] border border-[#2B2B36] hover:bg-[#252530] text-[#D4AF37] rounded-lg font-medium text-center flex items-center justify-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Orders</span>
                </button>
                <button
                  onClick={logout}
                  className="py-2 px-3 text-xs bg-[#1C1C22] text-red-400 hover:bg-red-950/40 rounded-lg flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigateTo('login')}
                className="py-2.5 px-3 bg-[#1C1C24] hover:bg-[#262632] text-xs font-medium text-neutral-200 rounded-lg flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                onClick={() => navigateTo('register')}
                className="py-2.5 px-3 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] hover:opacity-90 text-xs font-semibold text-black rounded-lg text-center"
              >
                Register
              </button>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              setIsCartDrawerOpen(true);
            }}
            className="w-full py-2.5 bg-[#141419] border border-[#D4AF37]/30 text-xs text-[#E6C25B] font-medium rounded-lg flex items-center justify-center gap-2 mt-1"
          >
            <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
            <span>Shopping Bag ({cartCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
