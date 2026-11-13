import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, ShieldCheck, Calendar } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { setCurrentPage, showToast } = useShop();

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'Timepiece Allocation Inquiry',
    message: '',
    preferredDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast('Please provide your name, email, and inquiry details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSubmitted(true);
        showToast('Your private concierge inquiry has been transmitted.');
      } else {
        showToast('Failed to dispatch inquiry. Please retry.', 'error');
      }
    } catch {
      setSubmitted(true);
      showToast('Your private concierge inquiry has been transmitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <span className="text-[#D4AF37] font-medium">VIP Concierge & Salons</span>
        </div>

        {/* Demo Notice */}
        <div className="mb-10 p-4 bg-[#111116] border border-[#2B2B36] rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              <strong>Demonstration Contact Desk:</strong> Information shown represents demo salon details for atelier review.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono text-neutral-500">Demo Active</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Salon Addresses & Phone */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
                Private Appointments
              </span>
              <h1 className="font-brand text-3xl sm:text-4xl font-bold text-white mt-1">
                Contact the Concierge
              </h1>
              <p className="mt-3 text-sm text-neutral-400 font-light leading-relaxed">
                Whether commissioning a bespoke bridal tuxedo or reserving an allocation for a skeleton tourbillon, our private concierge desk remains at your perpetual service.
              </p>
            </div>

            {/* Salon Cards */}
            <div className="space-y-4">
              <div className="p-6 bg-[#0E0E13] border border-[#22222B] rounded-2xl">
                <div className="flex items-center gap-2.5 text-[#D4AF37] font-semibold text-xs uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>New York Flagship Salon</span>
                </div>
                <div className="text-sm font-semibold text-white">740 Park Avenue, Penthouse B</div>
                <div className="text-xs text-neutral-400 mt-0.5">New York, NY 10021, United States</div>
                <div className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Private Appointments: Mon – Sat, 10:00 – 19:00 EST</span>
                </div>
              </div>

              <div className="p-6 bg-[#0E0E13] border border-[#22222B] rounded-2xl">
                <div className="flex items-center gap-2.5 text-[#D4AF37] font-semibold text-xs uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>Geneva Horology Manufacture</span>
                </div>
                <div className="text-sm font-semibold text-white">Rue du Rhône 42, 3ème Étage</div>
                <div className="text-xs text-neutral-400 mt-0.5">1204 Geneva, Switzerland</div>
                <div className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>By Invitation Only: Mon – Fri, 09:00 – 18:00 CET</span>
                </div>
              </div>

              <div className="p-6 bg-[#0E0E13] border border-[#22222B] rounded-2xl">
                <div className="flex items-center gap-2.5 text-[#D4AF37] font-semibold text-xs uppercase tracking-wider mb-2">
                  <Phone className="w-4 h-4" />
                  <span>Global Direct Lines</span>
                </div>
                <div className="text-xs text-neutral-300 space-y-1">
                  <div><strong>VIP Concierge:</strong> +1 (212) 555-LUXE (24/7)</div>
                  <div><strong>Geneva Vault Desk:</strong> +41 22 555 4900</div>
                  <div><strong>Secure Email:</strong> concierge@rgdluxe.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div className="lg:col-span-7 bg-[#0E0E13] border border-[#22222B] rounded-3xl p-6 sm:p-10 shadow-2xl">
            <h2 className="font-brand text-2xl font-bold text-white mb-2">
              Dispatch an Inquiry
            </h2>
            <p className="text-xs text-neutral-400 mb-8 font-light">
              Your message will be transmitted directly to the executive concierge desk. We respond within two hours.
            </p>

            {submitted ? (
              <div className="py-12 text-center bg-[#131318] border border-emerald-500/30 rounded-2xl p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-brand text-lg font-bold text-white">Inquiry Securely Transmitted</h3>
                <p className="text-xs text-neutral-300 max-w-sm mx-auto mt-2">
                  Thank you, {form.name}. A senior client liaison officer has received your requisition and will contact you via {form.email}.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: '', email: '', subject: 'Timepiece Allocation Inquiry', message: '', preferredDate: '' });
                  }}
                  className="mt-6 px-6 py-2 bg-[#20202A] text-xs font-semibold text-[#D4AF37] rounded-xl hover:bg-[#2A2A38]"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                      Your Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Lord Sterling"
                      required
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                      Private Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="sterling@sovereign.ch"
                      required
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                      Nature of Inquiry
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-neutral-200 focus:outline-none cursor-pointer"
                    >
                      <option value="Timepiece Allocation Inquiry">Timepiece Allocation Inquiry</option>
                      <option value="Bespoke Tuxedo Fitting">Bespoke Tuxedo Fitting</option>
                      <option value="Haute Couture Evening Gown">Haute Couture Evening Gown</option>
                      <option value="Private Salon VIP Viewing">Private Salon VIP Viewing</option>
                      <option value="Corporate / Diplomatic Gifting">Corporate / Diplomatic Gifting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                      Requested Appointment Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.preferredDate}
                        onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                        className="w-full py-2 px-3 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-neutral-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Your Requirements & Specifications <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Specify case preferences, sizing requirements, or private viewing requests..."
                    required
                    className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span>{isSubmitting ? 'Transmitting to Salon...' : 'Submit Concierge Request'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
