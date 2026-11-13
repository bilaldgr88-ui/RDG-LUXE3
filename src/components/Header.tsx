import React from 'react';
import { useShop } from '../context/ShopContext';
import { Menu, Search, ShoppingBag, Heart, User as UserIcon, Shield } from 'lucide-react';

interface HeaderProps {
  onOpenMobileNav: () => void;
  onOpenSearchModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav, onOpenSearchModal }) => {
  const { currentPage, setCurrentPage, cart, wishlist, user, setIsCartDrawerOpen, setIsWishlistDrawerOpen } = useShop();

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 bg-[#08080A]/95 backdrop-blur-md border-b border-[#1E1E22] transition-colors">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-6">
        {/* Left: Mobile Hamburger & Desktop Quick Nav */}
        <div className="flex items-center lg:hidden shrink-0">
          <button
            onClick={onOpenMobileNav}
            aria-label="Open Navigation Menu"
            className="p-1.5 sm:p-2 text-neutral-300 hover:text-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] rounded-md"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Brand Zone: RGD Logo Emblem + Luxury Wordmark */}
        <button
          onClick={() => {
            setCurrentPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 sm:gap-3 text-left group focus:outline-none cursor-pointer shrink-0"
        >
          <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:border-[#D4AF37] transition-all shrink-0">
            <img
              src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
              alt="RGD LUXE Emblem"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-brand text-sm sm:text-2xl font-bold tracking-[0.1em] sm:tracking-[0.2em] text-gold-gradient leading-none whitespace-nowrap">
              RGD LUXE
            </span>
            <span className="hidden sm:block text-[9px] tracking-[0.3em] uppercase text-neutral-400 font-medium mt-1">
              Haute Horlogerie & Couture
            </span>
          </div>
        </button>

        {/* Center: Desktop Navigation Links (Clean, Unboxed) */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-wide">
          <button
            onClick={() => setCurrentPage('home')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'home'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentPage('shop')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'shop'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Shop All
          </button>
          <button
            onClick={() => setCurrentPage('men')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'men'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Men
          </button>
          <button
            onClick={() => setCurrentPage('women')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'women'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Women
          </button>
          <button
            onClick={() => setCurrentPage('watches')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'watches'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Luxury Watches
          </button>
          <button
            onClick={() => setCurrentPage('new-arrivals')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'new-arrivals'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            New Arrivals
          </button>
          <button
            onClick={() => setCurrentPage('about')}
            className={`whitespace-nowrap transition-colors cursor-pointer py-1 ${
              currentPage === 'about'
                ? 'text-[#E6C25B] border-b-2 border-[#D4AF37]'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            Maison
          </button>
        </nav>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearchModal}
            aria-label="Search catalog"
            className="p-1.5 sm:p-2 text-neutral-300 hover:text-[#D4AF37] hover:bg-[#18181B] rounded-full transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Wishlist */}
          <button
            onClick={() => setIsWishlistDrawerOpen(true)}
            aria-label={`Wishlist (${wishlist.length} saved)`}
            className="hidden sm:flex relative p-2 text-neutral-300 hover:text-[#D4AF37] hover:bg-[#18181B] rounded-full transition-colors cursor-pointer"
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Customer / Admin Account */}
          <button
            onClick={() => {
              if (user?.role === 'admin') {
                setCurrentPage('admin');
              } else if (user) {
                setCurrentPage('account');
              } else {
                setCurrentPage('login');
              }
            }}
            aria-label={user ? `Account (${user.name})` : 'Client sign in'}
            className="flex items-center gap-2 p-1.5 sm:p-2 text-neutral-300 hover:text-[#D4AF37] hover:bg-[#18181B] rounded-full transition-colors cursor-pointer"
          >
            {user?.role === 'admin' ? (
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
            ) : (
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="hidden xl:inline text-xs font-medium text-neutral-300 max-w-[90px] truncate">
              {user ? user.name.split(' ')[0] : 'Sign In'}
            </span>
          </button>

          {/* Shopping Bag Button */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            aria-label={`Shopping bag (${totalCartCount} items)`}
            className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-[#18181C] to-[#121215] border border-[#2D2D33] hover:border-[#D4AF37]/60 rounded-full text-neutral-200 hover:text-[#E6C25B] transition-all cursor-pointer group shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold tabular-nums">
              {totalCartCount}
            </span>
            <span className="hidden md:inline text-xs text-neutral-400 group-hover:text-neutral-200">
              Bag
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
