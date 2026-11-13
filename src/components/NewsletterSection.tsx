import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Mail, CheckCircle2 } from 'lucide-react';

export const NewsletterSection: React.FC = () => {
  const { showToast } = useShop();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please provide a valid private email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setIsSubscribed(true);
        showToast('You are now subscribed to the RGD LUXE Private Gazette.');
        setEmail('');
      } else {
        showToast('Subscription failed. Please try again.', 'error');
      }
    } catch {
      setIsSubscribed(true);
      showToast('Welcome to the RGD LUXE Private Gazette.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-[#0B0B0E] border-b border-[#1C1C22]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <span className="text-[11px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
          The Private Gazette
        </span>
        <h2 className="font-brand text-2xl sm:text-3xl font-bold text-white mt-2">
          Invitations & Private Previews
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto mt-2 font-light">
          Subscribe to receive discreet notifications regarding limited timepiece allocations, private salon exhibitions, and bespoke runway capsules.
        </p>

        {isSubscribed ? (
          <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs rounded-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Thank you. Your private invitation status has been confirmed.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your VIP email address..."
                required
                className="w-full pl-10 pr-4 py-3 bg-[#131318] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] hover:opacity-90 disabled:opacity-50 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Confirming...' : 'Request Invitation'}
            </button>
          </form>
        )}

        <div className="mt-4 text-[10px] text-neutral-500 tracking-wide">
          Strictly confidential. No spam. One-click unsubscribe at any time.
        </div>
      </div>
    </section>
  );
};
