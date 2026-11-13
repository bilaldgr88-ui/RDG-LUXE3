import React from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Truck, PhoneCall, Sparkles } from 'lucide-react';

export const TopInfoStrip: React.FC = () => {
  const { setCurrentPage, user } = useShop();

  return (
    <aside aria-label="Store announcement" className="w-full bg-[#050507] border-b border-[#222226] text-[11px] sm:text-xs text-neutral-400 py-1.5 sm:py-2 px-3 sm:px-4 select-none relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Announcement */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="flex items-center gap-1.5 text-[#E6C25B] font-medium tracking-wide shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">RGD LUXE ATELIER</span>
          </span>
          <span className="hidden md:inline text-neutral-600">|</span>
          <span className="flex items-center gap-1.5 text-neutral-300 truncate">
            <Truck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span className="sm:hidden truncate">Free Shipping Over $1,000</span>
            <span className="hidden sm:inline">Complimentary White-Glove Armored Shipping on Orders Over $1,000</span>
          </span>
        </div>

        {/* Right Info & Quick Access */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-neutral-400 hover:text-[#E6C25B] transition-colors">
            <PhoneCall className="w-3 h-3 text-[#D4AF37]" />
            <span>Concierge: +1 (212) 555-LUXE</span>
          </div>

          <span className="hidden lg:inline text-neutral-700">|</span>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:flex text-[11px] text-neutral-500 uppercase tracking-wider items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Atelier Preview
            </span>

            {user?.role === 'admin' ? (
              <button
                onClick={() => setCurrentPage('admin')}
                className="text-[11px] font-semibold text-[#D4AF37] hover:underline uppercase tracking-wider cursor-pointer whitespace-nowrap"
              >
                Admin Suite
              </button>
            ) : (
              <button
                onClick={() => setCurrentPage('admin')}
                className="text-[11px] text-neutral-400 hover:text-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
                title="Director Portal"
              >
                Director Access
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
