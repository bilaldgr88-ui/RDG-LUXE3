import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { PageView } from '../types';
import {
  Home,
  LayoutGrid,
  User,
  Sparkles,
  Watch,
  Tag,
  UserCheck,
  ShoppingBag,
  Shield,
  Heart,
} from 'lucide-react';

interface DockItem {
  id: string;
  page?: PageView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isCart?: boolean;
  isWishlist?: boolean;
}

export const VerticalDock: React.FC = () => {
  const { currentPage, setCurrentPage, cart, wishlist, setIsCartDrawerOpen, setIsWishlistDrawerOpen, user } = useShop();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const dockItems: DockItem[] = [
    { id: 'home', page: 'home', label: 'Home', icon: Home },
    { id: 'shop', page: 'shop', label: 'Shop All', icon: LayoutGrid },
    { id: 'men', page: 'men', label: "Men's Collection", icon: User },
    { id: 'women', page: 'women', label: "Women's Couture", icon: Sparkles },
    { id: 'watches', page: 'watches', label: 'Luxury Watches', icon: Watch },
    { id: 'offers', page: 'offers', label: 'Private Offers', icon: Tag },
    {
      id: 'wishlist',
      isWishlist: true,
      label: `Wishlist (${wishlistCount})`,
      icon: Heart,
    },
    {
      id: 'account',
      page: user?.role === 'admin' ? 'admin' : user ? 'account' : 'login',
      label: user?.role === 'admin' ? 'Admin Suite' : user ? 'My Account' : 'Client Login',
      icon: user?.role === 'admin' ? Shield : UserCheck,
    },
    { id: 'cart', isCart: true, label: `Shopping Bag (${cartCount})`, icon: ShoppingBag },
  ];

  const handleClick = (item: DockItem) => {
    if (item.isCart) {
      setIsCartDrawerOpen(true);
    } else if (item.isWishlist) {
      setIsWishlistDrawerOpen(true);
    } else if (item.page) {
      setCurrentPage(item.page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <aside
      aria-label="Quick Access Dock"
      className="fixed left-3 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center select-none"
    >
      <div className="bg-[#0C0C0F]/90 backdrop-blur-xl border border-[#2B2B33]/80 p-2 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col items-center gap-2.5 transition-all">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isCart && currentPage === item.page;
          const isHovered = hoveredId === item.id;

          return (
            <div key={item.id} className="relative flex items-center">
              <button
                onClick={() => handleClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={item.label}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#997A15] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-105'
                    : 'text-neutral-400 hover:text-white hover:bg-[#1A1A22] hover:scale-110'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />

                {/* Cart Badge */}
                {item.isCart && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}

                {/* Wishlist Badge */}
                {item.isWishlist && wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Tooltip on Hover (Mac-like smooth pill on the right) */}
              {isHovered && (
                <div
                  role="tooltip"
                  className="absolute left-14 whitespace-nowrap bg-[#121216] border border-[#D4AF37]/40 text-neutral-100 text-xs font-medium py-1.5 px-3 rounded-lg shadow-xl pointer-events-none animate-in fade-in slide-in-from-left-2 duration-150 z-50 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  <span>{item.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
