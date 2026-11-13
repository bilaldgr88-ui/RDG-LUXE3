import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ChevronDown, ShieldCheck, Truck, RotateCcw, Lock, FileText, Sparkles } from 'lucide-react';

interface PolicyWrapperProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const PolicyWrapper: React.FC<PolicyWrapperProps> = ({ title, subtitle, icon: Icon, children }) => {
  const { setCurrentPage } = useShop();

  return (
    <div className="py-12 sm:py-20 bg-[#08080A] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-8">
          <button
            onClick={() => setCurrentPage('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-[#D4AF37] font-medium">{title}</span>
        </div>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-[#1E1E26]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-2">
            <Icon className="w-4 h-4" />
            <span>Maison Institutional Protocols</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-4xl font-bold text-white tracking-wide">
            {title}
          </h1>
          <p className="mt-3 text-sm text-neutral-400 font-light leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-[#0E0E13] border border-[#22222B] rounded-3xl p-6 sm:p-10 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
};

// FAQ Page with Accordions
export const FAQPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How are RGD LUXE timepieces tested and certified?',
      a: 'Every mechanical timepiece undergoes our rigorous 500-hour manufacture control cycle in Le Locle, Switzerland. This includes chronometric rate testing across six positions and three temperatures, magnetic resistance validation up to 15,000 Gauss, and water-resistance pressure tests up to 10 ATM. Each watch is delivered with its individual serialized chronometer certificate.',
    },
    {
      q: 'What is the white-glove armored courier service?',
      a: 'All orders over $1,000 USD qualify for complimentary white-glove armored delivery. Orders are transported via climate-regulated, armored security transport and handed over directly to the verified recipient. An adult signature and government ID match are strictly mandatory at handover.',
    },
    {
      q: 'Are custom bespoke garments available?',
      a: 'Yes. In addition to our prêt-à-porter evening collections, Maison RGD LUXE maintains bespoke tailoring salons in Manhattan, Paris, and Geneva. Clients may request personalized fabric selections, monogramming, and private fittings by contacting the concierge.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We accept Cash on Delivery (COD) with private physical verification, direct bank wire escrow, and all major Centurion, Visa Infinite, and Mastercard Black cards through our encrypted terminal. All online transactions are processed under 256-bit AES cryptographic protocols.',
    },
    {
      q: 'What is the warranty coverage on RGD LUXE creations?',
      a: 'All RGD LUXE timepieces include our comprehensive 5-Year Global Atelier Warranty covering mechanical precision and craftsmanship defects. Haute couture evening attire is backed by complimentary lifetime fit adjustments at any of our flagship salons.',
    },
  ];

  return (
    <PolicyWrapper
      title="Frequently Asked Questions"
      subtitle="Comprehensive insights into our horological benchmarks, bespoke tailoring, and white-glove courier services."
      icon={Sparkles}
    >
      <div className="divide-y divide-[#1F1F27]">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="py-5 first:pt-0 last:pb-0">
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer"
              >
                <span className="font-brand text-base font-semibold text-white group-hover:text-gold-gradient transition-colors">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#D4AF37] transition-transform duration-300 shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-light leading-relaxed animate-in fade-in duration-200">
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PolicyWrapper>
  );
};

// Shipping Page
export const ShippingPage: React.FC = () => {
  return (
    <PolicyWrapper
      title="Shipping & Armored Delivery"
      subtitle="Discrete global transport managed by specialized luxury courier networks."
      icon={Truck}
    >
      <div className="space-y-6 text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">1. Global Armored Protocol</h3>
          <p className="text-neutral-400">
            Every shipment dispatched from our Geneva vault or Manhattan salon travels in discreet, unbranded security packaging equipped with cryptographic tamper seals and GPS tracking transponders.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">2. Complimentary White-Glove Threshold</h3>
          <p className="text-neutral-400">
            Orders exceeding $1,000 USD receive fully insured, complimentary white-glove courier dispatch worldwide. For orders under $1,000 USD, a standardized $50 flat-rate armored handling fee applies.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">3. Estimated Transit Windows</h3>
          <ul className="space-y-2 text-neutral-400 mt-2">
            <li>· <strong>North America:</strong> 1–2 business days via dedicated secure courier</li>
            <li>· <strong>Western Europe (Geneva, Paris, Milan, London):</strong> Next-day priority courier</li>
            <li>· <strong>Middle East & Asia-Pacific:</strong> 2–3 business days via diplomatic air logistics</li>
          </ul>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">4. Identity Verification Upon Handover</h3>
          <p className="text-neutral-400">
            To prevent fraud and maintain chain of custody, couriers are authorized to release parcels only to the named recipient upon inspection of government-issued photo identification.
          </p>
        </div>
      </div>
    </PolicyWrapper>
  );
};

// Returns Page
export const ReturnsPage: React.FC = () => {
  return (
    <PolicyWrapper
      title="Returns & Atelier Exchanges"
      subtitle="Discreet 30-day inspection period honoring client peace of mind."
      icon={RotateCcw}
    >
      <div className="space-y-6 text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">1. 30-Day Inspection Privilege</h3>
          <p className="text-neutral-400">
            Maison RGD LUXE offers an unconditional 30-day return or exchange window from the date of physical receipt. All pieces must remain unworn with security seals intact and all original documentation present.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">2. Return Security Protocol</h3>
          <p className="text-neutral-400">
            Contact your dedicated concierge to arrange an armored courier collection directly from your private residence. Do not dispatch high-value timepieces via standard postal services.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">3. Atelier Verification & Refund</h3>
          <p className="text-neutral-400">
            Upon receipt at our Geneva or New York manufacture, pieces undergo master horologist inspection within 24 hours. Refunds are credited via original settlement method or bank wire escrow.
          </p>
        </div>
      </div>
    </PolicyWrapper>
  );
};

// Privacy Page
export const PrivacyPage: React.FC = () => {
  return (
    <PolicyWrapper
      title="Privacy & Data Stewardship"
      subtitle="Bank-grade confidentiality protocols protecting our VIP client roster."
      icon={Lock}
    >
      <div className="space-y-6 text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">1. Absolute Confidentiality</h3>
          <p className="text-neutral-400">
            Maison RGD LUXE maintains an absolute zero-compromise policy regarding client privacy. We never monetize, share, or disclose client names, addresses, or acquisition histories to third parties.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">2. Cryptographic Security Standards</h3>
          <p className="text-neutral-400">
            All database records, transaction hashes, and salon appointment logs are encrypted with AES-256 cipher protection. Access within the Maison is restricted strictly to executive liaisons.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">3. The Right to Total Erasure</h3>
          <p className="text-neutral-400">
            Clients may request immediate, permanent deletion of their account records and transaction metadata at any time through our security officer desk.
          </p>
        </div>
      </div>
    </PolicyWrapper>
  );
};

// Terms Page
export const TermsPage: React.FC = () => {
  return (
    <PolicyWrapper
      title="Terms & Conditions"
      subtitle="Standard legal covenants governing acquisitions and services at Maison RGD LUXE."
      icon={FileText}
    >
      <div className="space-y-6 text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">1. Scope of Agreement</h3>
          <p className="text-neutral-400">
            By commissioning bespoke apparel or acquiring timepieces through RGD LUXE, you agree to these legal covenants. Demonstration goods displayed on this domain are for atelier testing and client presentation.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">2. Authenticity & Limited Editions</h3>
          <p className="text-neutral-400">
            Each creation is registered under a unique serialized patent identifier. Replicating or counterfeiting RGD marks will be prosecuted under Swiss and United States intellectual property statutes.
          </p>
        </div>

        <div>
          <h3 className="font-brand text-base font-semibold text-white mb-2">3. Governing Jurisdiction</h3>
          <p className="text-neutral-400">
            Any disputes arising under these covenants shall be arbitrated under the laws of the Canton of Geneva, Switzerland, or the State of New York, United States.
          </p>
        </div>
      </div>
    </PolicyWrapper>
  );
};
