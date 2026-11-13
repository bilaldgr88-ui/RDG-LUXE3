import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight, Sparkles, Watch } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { setCurrentPage } = useShop();

  return (
    <section className="relative w-full overflow-hidden bg-black border-b border-[#24242A]">
      {/* Mobile Optimized Campaign Banner (< md) — shows full model + gold RGD emblem without edge cropping */}
      <div className="md:hidden flex flex-col bg-black">
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-black border-b border-[#1E1E24]">
          <img
            src="/public/assets/aistudio/image_4a962f72_73843b7b.jpg"
            alt="RGD LUXE Timeless Style Modern Luxury Campaign"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="px-3.5 py-5 bg-gradient-to-b from-[#08080B] to-black">
          <div className="bg-[#0C0C10]/90 p-5 rounded-2xl border border-[#D4AF37]/30 shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#121217] border border-[#D4AF37]/45 rounded-full mb-3">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#F3E5AB]">
                New York · Geneva · Paris
              </span>
            </div>

            <h1 className="font-brand text-3xl font-extrabold tracking-[0.14em] text-gold-gradient uppercase leading-none">
              RGD LUXE
            </h1>

            <div className="mt-2 font-editorial text-lg text-neutral-100 italic tracking-wide font-normal">
              "TIMELESS STYLE. MODERN LUXURY."
            </div>

            <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed font-light">
              Discover the Art of Refined Living. An exclusive synthesis of master-tailored evening couture and Swiss-certified mechanical timepieces.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => {
                  setCurrentPage('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] text-black font-semibold text-xs tracking-wider uppercase rounded-full shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setCurrentPage('watches');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0F0F14] border border-[#D4AF37]/45 text-neutral-200 text-xs font-medium tracking-wider uppercase rounded-full cursor-pointer"
              >
                <Watch className="w-4 h-4 text-[#D4AF37]" />
                <span>Horology Salon</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5 text-[10px] text-neutral-300 text-center">
              <span className="truncate">Swiss Calibres</span>
              <span className="truncate">Italian Silks</span>
              <span className="truncate">White-Glove</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Cinematic Banner Container (Preserved Unchanged) */}
      <div className="hidden md:flex relative w-full min-h-[660px] lg:min-h-[740px] flex-col justify-end">
        {/* Cinematic Backdrop Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/public/assets/aistudio/image_4a962f72_73843b7b.jpg"
            alt="RGD LUXE Timeless Style Modern Luxury Campaign"
            className="w-full h-full object-cover object-center lg:object-center opacity-95 transition-transform duration-1000 ease-out"
          />
          {/* Subtle perimeter vignette and lower gradient to ensure razor-sharp text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
          <div className="max-w-2xl bg-black/50 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-[#D4AF37]/30 shadow-2xl">
            {/* Heritage Kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121217]/90 border border-[#D4AF37]/50 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#F3E5AB]">
                New York · Geneva · Paris
              </span>
            </div>

            {/* Brand Title */}
            <h1 className="font-brand text-4xl sm:text-6xl font-extrabold tracking-[0.16em] text-gold-gradient uppercase leading-none drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]">
              RGD LUXE
            </h1>

            {/* Campaign Headline */}
            <div className="mt-3 font-editorial text-2xl sm:text-3xl text-neutral-100 italic tracking-wide font-normal drop-shadow-md">
              "TIMELESS STYLE. MODERN LUXURY."
            </div>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base text-neutral-300 max-w-xl leading-relaxed font-light">
              Discover the Art of Refined Living. An exclusive synthesis of master-tailored evening couture and Swiss-certified mechanical timepieces.
            </p>

            {/* Interactive CTAs */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => {
                  setCurrentPage('shop');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] text-black font-semibold text-xs tracking-wider uppercase rounded-full shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setCurrentPage('watches');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0F0F14]/90 hover:bg-[#1A1A22] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-neutral-200 hover:text-white text-xs font-medium tracking-wider uppercase rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer"
              >
                <Watch className="w-4 h-4 text-[#D4AF37]" />
                <span>Horology Salon</span>
              </button>
            </div>

            {/* Trust markers */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-6 text-[11px] text-neutral-300 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                <span>Original Swiss Calibres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                <span>Bespoke Italian Silks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                <span>White-Glove Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
