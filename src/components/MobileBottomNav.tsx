import React from 'react';
import { useShop } from '../context/ShopContext';
import { Home, LayoutGrid, Search, ShoppingBag, User } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenSearch: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSearch }) => {
  const { currentPage, setCurrentPage, cart, setIsCartDrawerOpen, user } = useShop();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0C0C0F]/95 backdrop-blur-lg border-t border-[#202026] lg:hidden h-15 flex items-center justify-around px-2 select-none"
    >
      {/* Home */}
      <button
        onClick={() => {
          setCurrentPage('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Home"
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          currentPage === 'home' ? 'text-[#D4AF37]' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-wider font-medium">Home</span>
      </button>

      {/* Shop All */}
      <button
        onClick={() => {
          setCurrentPage('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Shop"
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          currentPage === 'shop' || currentPage === 'men' || currentPage === 'women' || currentPage === 'watches'
            ? 'text-[#D4AF37]'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-wider font-medium">Catalog</span>
      </button>

      {/* Search */}
      <button
        onClick={onOpenSearch}
        aria-label="Search"
        className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-[#D4AF37]"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-wider font-medium">Search</span>
      </button>

      {/* Cart with count badge */}
      <button
        onClick={() => setIsCartDrawerOpen(true)}
        aria-label={`Cart (${cartCount})`}
        className="relative flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-[#D4AF37]"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-[#D4AF37] text-black text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-wider font-medium">Bag</span>
      </button>

      {/* Account */}
      <button
        onClick={() => {
          if (user?.role === 'admin') {
            setCurrentPage('admin');
          } else if (user) {
            setCurrentPage('account');
          } else {
            setCurrentPage('login');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Account"
        className={`flex flex-col items-center justify-center flex-1 py-1 ${
          currentPage === 'account' || currentPage === 'admin' || currentPage === 'login' || currentPage === 'register'
            ? 'text-[#D4AF37]'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-wider font-medium">
          {user ? 'Account' : 'Sign In'}
        </span>
      </button>
    </nav>
  );
};
