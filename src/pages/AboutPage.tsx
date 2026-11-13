import React from 'react';
import { useShop } from '../context/ShopContext';
import { Sparkles, Shield, Compass, Award, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { setCurrentPage } = useShop();

  return (
    <div className="py-12 sm:py-20 bg-[#08080A] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-8">
          <button
            onClick={() => setCurrentPage('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-[#D4AF37] font-medium">About Maison RGD LUXE</span>
        </div>

        {/* Hero Section of About Us */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center pb-20 border-b border-[#1E1E26]">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Maison Philosophy</span>
            </div>
            <h1 className="font-brand text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Timeless Style. <br />
              <span className="text-gold-gradient">Modern Luxury.</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-neutral-300 font-light leading-relaxed">
              RGD LUXE was founded with an unyielding mandate: to reject seasonal ephemera in pursuit of eternal distinction. We synthesize the razor-sharp architectural authority of modern Manhattan with the sacred traditions of Swiss mechanical horology and European haute couture.
            </p>
            <p className="mt-4 text-sm text-neutral-400 font-light leading-relaxed">
              Every creation bearing the RGD gold crest is an instrument of status, produced in strictly limited serialized editions for collectors who understand that luxury is not about excess—it is about perfection.
            </p>

            <div className="mt-8 flex items-center gap-8 text-xs">
              <div>
                <span className="font-brand text-2xl font-bold text-white block">100%</span>
                <span className="text-neutral-500 uppercase tracking-wider">In-House Atelier</span>
              </div>
              <div className="h-8 w-px bg-[#262630]" />
              <div>
                <span className="font-brand text-2xl font-bold text-white block">72 Hr</span>
                <span className="text-neutral-500 uppercase tracking-wider">Power Reserve Benchmark</span>
              </div>
              <div className="h-8 w-px bg-[#262630]" />
              <div>
                <span className="font-brand text-2xl font-bold text-white block">Limited</span>
                <span className="text-neutral-500 uppercase tracking-wider">Serialized Runs</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border border-[#2B2B36] shadow-2xl">
              <img
                src="/src/assets/images/atelier_craftsman_1794495941003.jpg"
                alt="Master Horologist assembling RGD tourbillon movement in Geneva atelier"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
                    Manufacture Le Locle & Geneva
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Master Watchmaker Hand-Chamfering
                  </div>
                </div>
                <img
                  src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
                  alt="RGD Gold Seal"
                  className="w-12 h-12 rounded-full border border-[#D4AF37]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Four Core Pillars */}
        <div className="py-20 border-b border-[#1E1E26]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
              The Four Foundations
            </span>
            <h2 className="font-brand text-3xl font-bold text-white mt-2">
              Uncompromising Standards of Excellence
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 bg-[#0D0D11] border border-[#202028] rounded-3xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-6">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-brand text-lg font-bold text-white">
                Swiss Horology
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed font-light">
                Assembled by master watchmakers in Le Locle. Our calibres feature hand-chamfered Geneva stripes, silicon escapements, and tourbillon regulators.
              </p>
            </div>

            <div className="p-8 bg-[#0D0D11] border border-[#202028] rounded-3xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-brand text-lg font-bold text-white">
                Sartorial Purity
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed font-light">
                Tailored with floating horsehair canvas from Biella, Italy. Super 160s virgin wool, raw mulberry silks, and real buffalo horn closures.
              </p>
            </div>

            <div className="p-8 bg-[#0D0D11] border border-[#202028] rounded-3xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-brand text-lg font-bold text-white">
                Noble Materials
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed font-light">
                Solid 18K rose gold, 950 platinum, Grade 5 black micro-blasted titanium, and certified conflict-free diamonds hand-set under stereoscopic microscopes.
              </p>
            </div>

            <div className="p-8 bg-[#0D0D11] border border-[#202028] rounded-3xl hover:border-[#D4AF37]/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#16161D] border border-[#2A2A33] flex items-center justify-center text-[#D4AF37] mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-brand text-lg font-bold text-white">
                Ethical Stewardship
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed font-light">
                Carbon-neutral global operations, responsible precious metal sourcing via the RJC (Responsible Jewellery Council), and heirloom longevity guarantees.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Timepiece & Tailoring Heritage split */}
        <div className="pt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden border border-[#2B2B36] shadow-2xl">
              <img
                src="/src/assets/images/watch_rose_gold_1794494079347.jpg"
                alt="Swiss Calibre Macro"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2">
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
              The Horology Atelier
            </span>
            <h2 className="font-brand text-3xl sm:text-4xl font-bold text-white mt-2">
              The Engineering of Immortality
            </h2>
            <p className="mt-4 text-sm text-neutral-300 font-light leading-relaxed">
              Mechanical watches are mechanical living hearts. In an era dominated by disposable digital screens, a hand-finished tourbillon or automatic chronograph remains the ultimate declaration of taste and endurance.
            </p>
            <p className="mt-3 text-xs text-neutral-400 font-light leading-relaxed">
              Every RGD watch undergoes 500 hours of temperature, shock, and chronometric testing before being placed in its solid walnut presentation chest.
            </p>

            <button
              onClick={() => {
                setCurrentPage('watches');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="mt-8 px-8 py-3.5 bg-[#121217] hover:bg-[#1C1C24] border border-[#D4AF37]/50 text-[#D4AF37] hover:text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Explore The Timepiece Vault</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
