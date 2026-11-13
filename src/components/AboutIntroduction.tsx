import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight, Compass, Award, Shield } from 'lucide-react';

export const AboutIntroduction: React.FC = () => {
  const { setCurrentPage } = useShop();

  return (
    <section className="py-20 sm:py-28 bg-[#09090C] border-b border-[#1A1A20] relative overflow-hidden">
      {/* Decorative subtle gold radial ambient backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D4AF37]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Brand Emblem & Visual Accent */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="relative mb-6">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-tr from-[#D4AF37] via-[#94761E] to-[#E6C25B] shadow-[0_0_40px_rgba(212,175,55,0.25)]">
                <img
                  src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
                  alt="RGD Official Seal"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] font-semibold text-[#D4AF37]">
              Maison de Haute Horlogerie & Couture
            </span>
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-white mt-2">
              The Heritage of RGD LUXE
            </h2>
            <p className="mt-4 text-sm text-neutral-400 font-light leading-relaxed max-w-md">
              Founded on the belief that true luxury lies in timeless restraint and uncompromising craftsmanship. From our Parisian ateliers to Geneva watchmaking benches, we engineer heirlooms for the discerning modern elite.
            </p>

            <button
              onClick={() => {
                setCurrentPage('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="mt-8 inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#F3E5AB] hover:text-white transition-colors cursor-pointer group"
            >
              <span>Read Our Full Story</span>
              <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>

          {/* Right Column: Three Pillars of Craftsmanship */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-[#0E0E12] border border-[#22222A] rounded-2xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-brand text-base font-semibold text-white">
                Bespoke Precision
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Super 160s virgin wools and hand-cut mulberry silks tailored to exacting bespoke standards.
              </p>
            </div>

            <div className="p-6 bg-[#0E0E12] border border-[#22222A] rounded-2xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-brand text-base font-semibold text-white">
                Swiss Calibres
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Hand-anglage tourbillons and certified chronographs manufactured in Le Locle, Switzerland.
              </p>
            </div>

            <div className="p-6 bg-[#0E0E12] border border-[#22222A] rounded-2xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-brand text-base font-semibold text-white">
                Armored Delivery
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Discrete white-glove security courier dispatched to private residences globally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
