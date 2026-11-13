import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  calculateCartTotals,
  formatPrice,
  getEffectivePrice,
  hasActiveDiscount,
  validateOrderInput,
} from '../utils/pricing';
import { ShieldCheck, Lock, CreditCard, Banknote, AlertCircle, Loader2 } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    user,
    promoCode,
    clearCart,
    setLastOrder,
    setCurrentPage,
    refreshOrders,
    showToast,
    refreshProducts,
  } = useShop();

  const totals = calculateCartTotals(cart, promoCode);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    postalCode: user?.postalCode || '',
    country: user?.country || 'United States',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card_demo'>('cod');
  const [demoCardData, setDemoCardData] = useState({
    cardNumber: '4532 •••• •••• 8892',
    cardName: user?.name || '',
    expiry: '12/28',
    cvv: '891',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="py-24 text-center bg-[#09090C] min-h-screen px-4">
        <div className="max-w-md mx-auto p-8 bg-[#0F0F14] border border-[#22222B] rounded-3xl">
          <h2 className="font-brand text-xl font-bold text-white mb-2">No Items in Bag</h2>
          <p className="text-xs text-neutral-400 mb-6">Your shopping bag is currently empty.</p>
          <button
            onClick={() => setCurrentPage('shop')}
            className="px-6 py-2.5 bg-[#D4AF37] text-black text-xs font-semibold rounded-xl cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateOrderInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      showToast('Please correct the highlighted delivery details.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country,
        },
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
        })),
        paymentMethod,
        promoCode: promoCode || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to place order.');
        showToast(data.error || 'Order placement failed.', 'error');
        return;
      }

      setLastOrder(data);
      clearCart();
      await refreshOrders();
      await refreshProducts();
      showToast(`Order ${data.orderNumber} confirmed!`);
      setCurrentPage('order-confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('Network failure connecting to the Maison ordering terminal.');
      showToast('Network error processing acquisition.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10 sm:py-16 bg-[#08080A] min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6 sm:mb-8">
          <button
            onClick={() => setCurrentPage('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => setCurrentPage('cart')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Shopping Bag
          </button>
          <span>/</span>
          <span className="text-[#D4AF37] font-medium">Checkout</span>
        </div>

        <h1 className="font-brand text-2xl sm:text-4xl font-bold text-white mb-2">
          Secure Acquisition & Dispatch
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mb-8 sm:mb-10 font-light">
          Discrete, armored logistics managed exclusively by Maison RGD LUXE Global Security.
        </p>

        {submitError && (
          <div className="mb-8 p-4 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-center gap-3 text-xs text-red-300">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
          {/* Form Details Column */}
          <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8 min-w-0">
            {/* 1. Client Identity */}
            <div className="bg-[#0F0F14] border border-[#22222B] rounded-3xl p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#1E1E26] mb-6">
                <h2 className="font-brand text-base sm:text-lg font-bold text-white">
                  1. Client Contact & Verification
                </h2>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Encrypted Form</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Dispatch Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (212) 555-0199"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.phone && <p className="text-[11px] text-red-400 mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* 2. Armored Delivery Address */}
            <div className="bg-[#0F0F14] border border-[#22222B] rounded-3xl p-5 sm:p-8">
              <div className="pb-4 border-b border-[#1E1E26] mb-6">
                <h2 className="font-brand text-base sm:text-lg font-bold text-white">
                  2. Residence / Delivery Destination
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Street Address & Suite <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street address, building, apartment"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.address ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.address && <p className="text-[11px] text-red-400 mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.city ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.city && <p className="text-[11px] text-red-400 mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Postal Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Postal code"
                    className={`w-full py-2.5 px-3.5 bg-[#141419] border rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none ${
                      errors.postalCode ? 'border-red-500 ring-1 ring-red-500' : 'border-[#2B2B36] focus:border-[#D4AF37]'
                    }`}
                  />
                  {errors.postalCode && <p className="text-[11px] text-red-400 mt-1">{errors.postalCode}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 font-medium mb-1.5">
                    Special Handover Instructions
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Doorman verification, private gate access code, or preferred delivery window..."
                    className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2B2B36] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-[#0F0F14] border border-[#22222B] rounded-3xl p-5 sm:p-8">
              <div className="pb-4 border-b border-[#1E1E26] mb-6">
                <h2 className="font-brand text-base sm:text-lg font-bold text-white">
                  3. Settlement Method
                </h2>
              </div>

              <div className="space-y-4">
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 sm:gap-4 ${
                    paymentMethod === 'cod'
                      ? 'border-[#D4AF37] bg-[#181820]'
                      : 'border-[#262632] bg-[#121217] hover:border-neutral-500'
                  }`}
                >
                  <div className="mt-1">
                    <input
                      type="radio"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="text-[#D4AF37] focus:ring-0"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-white">
                        Cash on Delivery (White-Glove Handover)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      Settle upon physical inspection and security verification by our courier.
                    </p>
                  </div>
                </div>

                {/* Demo Card Payment Option */}
                <div
                  onClick={() => setPaymentMethod('card_demo')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 sm:gap-4 ${
                    paymentMethod === 'card_demo'
                      ? 'border-[#D4AF37] bg-[#181820]'
                      : 'border-[#262632] bg-[#121217] hover:border-neutral-500'
                  }`}
                >
                  <div className="mt-1">
                    <input
                      type="radio"
                      checked={paymentMethod === 'card_demo'}
                      onChange={() => setPaymentMethod('card_demo')}
                      className="text-[#D4AF37] focus:ring-0"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-sm font-semibold text-white">
                          Card Simulator (DEMO ONLY)
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono bg-[#252530] text-[#D4AF37] px-2 py-0.5 rounded font-bold">
                        DEMO ONLY · NOT CHARGED
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Demonstration payment simulator only — no live payment gateway is connected and no card is charged.
                    </p>

                    {paymentMethod === 'card_demo' && (
                      <div className="mt-4 pt-4 border-t border-[#2A2A36] grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[11px] text-neutral-400 mb-1">Simulated Card Number (Demo)</label>
                          <input
                            type="text"
                            value={demoCardData.cardNumber}
                            onChange={(e) => setDemoCardData({ ...demoCardData, cardNumber: e.target.value })}
                            className="w-full py-1.5 px-3 bg-[#111116] border border-[#2C2C38] rounded-lg text-xs font-mono text-neutral-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Valid Thru</label>
                          <input
                            type="text"
                            value={demoCardData.expiry}
                            onChange={(e) => setDemoCardData({ ...demoCardData, expiry: e.target.value })}
                            className="w-full py-1.5 px-3 bg-[#111116] border border-[#2C2C38] rounded-lg text-xs font-mono text-neutral-200"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Demo CVV</label>
                          <input
                            type="text"
                            value={demoCardData.cvv}
                            onChange={(e) => setDemoCardData({ ...demoCardData, cvv: e.target.value })}
                            className="w-full py-1.5 px-3 bg-[#111116] border border-[#2C2C38] rounded-lg text-xs font-mono text-neutral-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review & Submit */}
          <div className="lg:col-span-5 bg-[#0F0F14] border border-[#24242E] rounded-3xl p-5 sm:p-8 min-w-0">
            <h2 className="font-brand text-lg font-bold text-white mb-6">
              Acquisition Manifest
            </h2>

            {/* List */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1 divide-y divide-[#1D1D26] mb-6">
              {cart.map((item) => {
                const effPrice = getEffectivePrice(item.product);
                const discounted = hasActiveDiscount(item.product);

                return (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#262630] shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white line-clamp-1">{item.product.name}</h4>
                        <div className="text-[11px] text-neutral-400">
                          Qty: {item.quantity} {item.selectedSize && `· ${item.selectedSize}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-white tabular-nums block">
                        {formatPrice(effPrice * item.quantity)}
                      </span>
                      {discounted && item.product.originalPrice && (
                        <span className="text-[10px] text-neutral-500 line-through tabular-nums block">
                          {formatPrice(item.product.originalPrice * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price lines */}
            <div className="space-y-2 text-xs text-neutral-400 pt-4 border-t border-[#202028]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white tabular-nums">{formatPrice(totals.subtotal)}</span>
              </div>
              {totals.productSavings > 0 && (
                <div className="flex justify-between text-[#E6C25B]">
                  <span>Product Offer Savings</span>
                  <span className="tabular-nums">-{formatPrice(totals.productSavings)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>VIP Coupon ({promoCode})</span>
                  <span className="tabular-nums">-{formatPrice(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Armored Courier</span>
                <span className="text-white tabular-nums">
                  {totals.shippingFee === 0 ? 'Complimentary' : formatPrice(totals.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Excise Tax</span>
                <span className="text-white tabular-nums">{formatPrice(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-4 border-t border-[#242432]">
                <span>Total Commitment</span>
                <span className="text-2xl text-gold-gradient tabular-nums">
                  {formatPrice(totals.total)}
                </span>
              </div>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-8 py-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Authorizing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>Confirm Acquisition Order</span>
                </>
              )}
            </button>

            <div className="mt-4 text-[10px] text-neutral-500 text-center flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-[#D4AF37]" />
              <span>Authoritative Server Pricing Verification Active</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
