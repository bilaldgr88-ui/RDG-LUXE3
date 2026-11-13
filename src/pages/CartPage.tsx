import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  calculateCartTotals,
  formatPrice,
  getDiscountPercentage,
  getEffectivePrice,
  hasActiveDiscount,
} from '../utils/pricing';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Tag, ArrowLeft } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, setCurrentPage, viewProduct, promoCode, setPromoCode } = useShop();
  const [promoInput, setPromoInput] = useState(promoCode);

  const totals = calculateCartTotals(cart, promoCode);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (clean === 'RGD10' || clean === 'LUXE20' || clean === 'VIP100') {
      setPromoCode(clean);
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
          <span className="text-[#D4AF37] font-medium">Shopping Bag</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-[#1C1C24]">
          <h1 className="font-brand text-2xl sm:text-3xl font-bold text-white">
            Your Private Shopping Bag
          </h1>
          <button
            onClick={() => setCurrentPage('shop')}
            className="text-xs uppercase tracking-wider text-neutral-400 hover:text-[#D4AF37] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Curating</span>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="py-16 sm:py-24 text-center bg-[#0D0D12] border border-[#202028] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#14141A] border border-[#282833] flex items-center justify-center text-neutral-500 mx-auto mb-6">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="font-brand text-2xl font-bold text-white">Your Shopping Bag is Empty</h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto mt-2 font-light">
              You have not added any haute horlogerie or bespoke garments to your acquisition portfolio.
            </p>
            <button
              onClick={() => setCurrentPage('shop')}
              className="mt-8 px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] text-black text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer shadow-lg hover:opacity-95"
            >
              Explore Masterpiece Collections
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
            {/* Items Column */}
            <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
              <div className="p-4 bg-[#111116] border border-[#22222C] rounded-2xl flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
                  <span>
                    {totals.subtotal >= 1000
                      ? 'Complimentary White-Glove Armored Courier activated for this order.'
                      : `Add ${formatPrice(1000 - totals.subtotal)} more to unlock complimentary white-glove shipping.`}
                  </span>
                </div>
              </div>

              {/* Items Card */}
              <div className="bg-[#0E0E13] border border-[#202028] rounded-3xl p-4 sm:p-6 divide-y divide-[#1B1B22]">
                {cart.map((item) => {
                  const effPrice = getEffectivePrice(item.product);
                  const discounted = hasActiveDiscount(item.product);
                  const pct = getDiscountPercentage(item.product);

                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                      className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          onClick={() => viewProduct(item.product.id)}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl border border-[#292933] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold">
                            {item.product.categoryLabel}
                          </div>
                          <h3
                            onClick={() => viewProduct(item.product.id)}
                            className="font-brand text-base sm:text-lg font-bold text-white hover:text-gold-gradient transition-colors cursor-pointer truncate"
                          >
                            {item.product.name}
                          </h3>
                          <div className="text-xs text-neutral-400 mt-1 font-mono">
                            {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                            {item.selectedSize && item.selectedColor && <span> · </span>}
                            {item.selectedColor && <span>{item.selectedColor}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
                            <span className="text-white font-semibold">{formatPrice(effPrice)} each</span>
                            {discounted && item.product.originalPrice && (
                              <>
                                <span className="line-through text-neutral-500">
                                  {formatPrice(item.product.originalPrice)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#E6C25B] rounded font-semibold">
                                  -{pct}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 sm:justify-end">
                        {/* Stepper */}
                        <div className="flex items-center border border-[#2B2B36] rounded-xl bg-[#14141A]">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                            aria-label="Decrease quantity"
                            className="p-2 text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3.5 text-xs font-semibold text-white tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                            aria-label="Increase quantity"
                            className="p-2 text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[85px]">
                          <div className="text-base font-bold text-white tabular-nums">
                            {formatPrice(effPrice * item.quantity)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                            className="text-xs text-red-400 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4 bg-[#0F0F14] border border-[#24242E] rounded-3xl p-5 sm:p-8 min-w-0">
              <h2 className="font-brand text-lg font-bold text-white mb-6">
                Acquisition Summary
              </h2>

              {/* Promo input */}
              <form onSubmit={handleApplyPromo} className="flex gap-2 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Coupon (RGD10 / LUXE20)"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#141419] border border-[#2B2B36] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#1C1C24] hover:bg-[#282833] text-xs font-semibold text-[#D4AF37] rounded-xl cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </form>

              {promoCode && (
                <div className="mb-4 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/60 flex items-center justify-between gap-2">
                  <span>Coupon "{promoCode}" Active</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">-{formatPrice(totals.discount)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoCode('');
                        setPromoInput('');
                      }}
                      className="text-neutral-400 hover:text-white underline text-[11px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-xs text-neutral-400 pb-6 border-b border-[#202028]">
                <div className="flex justify-between">
                  <span>Total Items</span>
                  <span className="text-white tabular-nums">{totals.itemCount}</span>
                </div>
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
                    <span>VIP Coupon Savings</span>
                    <span className="tabular-nums">-{formatPrice(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>White-Glove Armored Courier</span>
                  <span className="text-white tabular-nums">
                    {totals.shippingFee === 0 ? 'Complimentary' : formatPrice(totals.shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Luxury Import Tax</span>
                  <span className="text-white tabular-nums">{formatPrice(totals.tax)}</span>
                </div>
              </div>

              <div className="py-6 border-b border-[#202028] flex items-baseline justify-between text-lg font-bold text-white">
                <span>Total Amount</span>
                <span className="text-2xl text-gold-gradient tabular-nums">
                  {formatPrice(totals.total)}
                </span>
              </div>

              <button
                onClick={() => {
                  setCurrentPage('checkout');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full mt-6 py-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
