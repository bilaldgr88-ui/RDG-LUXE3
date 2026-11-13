import React from 'react';
import { useShop } from '../context/ShopContext';
import { PageView } from '../types';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentPage, user } = useShop();

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050507] text-neutral-400 border-t border-[#1C1C22] pt-12 sm:pt-16 pb-24 lg:pb-16 select-none">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#1A1A22]">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
                alt="RGD LUXE Seal"
                className="w-10 h-10 rounded-full border border-[#D4AF37]/50"
              />
              <span className="font-brand text-2xl font-bold tracking-[0.2em] text-gold-gradient">
                RGD LUXE
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed font-light">
              RGD LUXE represents the zenith of international luxury fashion and mechanical horology. Hand-crafted in Milan, Paris, and Geneva for collectors of uncompromising taste.
            </p>
            <div className="mt-6 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[#D4AF37] font-semibold">Flagship Salon:</span>
                <span>740 Park Avenue, New York, NY 10021</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[#D4AF37] font-semibold">VIP Concierge:</span>
                <span>+1 (212) 555-LUXE (24/7 Priority Desk)</span>
              </div>
            </div>
          </div>

          {/* Catalog Links */}
          <div>
            <h4 className="font-brand text-xs uppercase tracking-[0.2em] text-white font-semibold mb-4">
              Creations
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('shop')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Shop All Collections
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('men')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Men's Sartorial Attire
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('women')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Women's Evening Couture
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('watches')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Swiss Haute Horlogerie
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('new-arrivals')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  New Arrivals (2026)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('best-sellers')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Iconic Best Sellers
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('offers')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[#E6C25B]"
                >
                  Special Private Offers
                </button>
              </li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div>
            <h4 className="font-brand text-xs uppercase tracking-[0.2em] text-white font-semibold mb-4">
              Concierge & Care
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('about')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  About Maison RGD
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('contact')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Contact Concierge
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('faq')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('shipping')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Armored Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('returns')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Returns & Atelier Exchanges
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('orders')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Order History & Tracking
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('account')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Client Account & Profile
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div>
            <h4 className="font-brand text-xs uppercase tracking-[0.2em] text-white font-semibold mb-4">
              Legal & Trust
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => navigateTo('privacy')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Privacy & Data Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('terms')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('admin')}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[#D4AF37] flex items-center gap-1"
                >
                  <span>{user?.role === 'admin' ? 'Admin Control Suite' : 'Director Portal'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </li>
              <li className="pt-3">
                <div className="p-3 bg-[#0F0F13] border border-[#22222A] rounded-xl text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5 text-neutral-200 font-medium mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Demonstration Store</span>
                  </div>
                  <span>Products and transactions in this deployment are configured for demonstration and atelier review.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © {new Date().getFullYear()} RGD LUXE Incorporated. All rights reserved. Registered trademark.
          </div>
          <div className="flex items-center gap-6">
            <span>Paris · Milan · Geneva · New York · Tokyo</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
