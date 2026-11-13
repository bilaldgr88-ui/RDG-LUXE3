import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  calculateCartTotals,
  formatPrice,
  getEffectivePrice,
  hasActiveDiscount,
} from '../utils/pricing';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    updateQuantity,
    removeFromCart,
    setCurrentPage,
    viewProduct,
    promoCode,
    setPromoCode,
  } = useShop();
  const [promoInput, setPromoInput] = useState(promoCode);

  if (!isCartDrawerOpen) return null;

  const totals = calculateCartTotals(cart, promoCode);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (clean === 'RGD10' || clean === 'LUXE20' || clean === 'VIP100') {
      setPromoCode(clean);
    }
  };

  const proceedToCheckout = () => {
    setIsCartDrawerOpen(false);
    setCurrentPage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewFullCart = () => {
    setIsCartDrawerOpen(false);
    setCurrentPage('cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#0D0D11] border-l border-[#24242D] h-full flex flex-col justify-between overflow-hidden z-10 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#202028] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-brand text-lg font-bold text-white tracking-wide">
              Shopping Bag ({totals.itemCount})
            </h2>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            aria-label="Close bag"
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-[#181820]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="bg-[#14141A] px-4 sm:px-5 py-3 border-b border-[#22222B] text-xs">
          {totals.subtotal >= 1000 ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Complimentary White-Glove Armored Courier Unlocked</span>
            </div>
          ) : (
            <div className="text-neutral-300">
              Add <span className="text-[#D4AF37] font-semibold">{formatPrice(1000 - totals.subtotal)}</span> more for complimentary armored delivery.
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-[#1D1D26]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#15151C] border border-[#2B2B36] flex items-center justify-center text-neutral-500 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-brand text-lg font-semibold text-white">Your Bag is Empty</h3>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                Explore our haute horlogerie and bespoke couture collections to acquire timeless creations.
              </p>
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  setCurrentPage('shop');
                }}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] text-black text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Discover Creations
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const effPrice = getEffectivePrice(item.product);
              const discounted = hasActiveDiscount(item.product);

              return (
                <div key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`} className="py-4 flex gap-3.5 sm:gap-4">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      viewProduct(item.product.id);
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-[#2B2B36] shrink-0 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => {
                            setIsCartDrawerOpen(false);
                            viewProduct(item.product.id);
                          }}
                          className="font-brand text-sm font-semibold text-white hover:text-[#E6C25B] transition-colors cursor-pointer line-clamp-1"
                        >
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                          aria-label="Remove item"
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs text-neutral-400 mt-0.5 truncate">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        {item.selectedSize && item.selectedColor && <span> · </span>}
                        {item.selectedColor && <span>{item.selectedColor}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#2B2B36] rounded-lg bg-[#14141A]">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                          aria-label="Decrease quantity"
                          className="p-1.5 text-neutral-400 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-semibold text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                          aria-label="Increase quantity"
                          className="p-1.5 text-neutral-400 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-white tabular-nums block">
                          {formatPrice(effPrice * item.quantity)}
                        </span>
                        {discounted && item.product.originalPrice && (
                          <span className="text-[10px] text-neutral-500 line-through tabular-nums block">
                            {formatPrice(item.product.originalPrice * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#202028] bg-[#0A0A0E] flex flex-col gap-3">
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo Code (RGD10 / LUXE20)"
                  className="w-full pl-9 pr-3 py-2 bg-[#14141A] border border-[#2B2B36] rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-[#1E1E26] hover:bg-[#2B2B38] text-xs font-semibold text-[#D4AF37] rounded-lg shrink-0"
              >
                Apply
              </button>
            </form>

            {promoCode && (
              <div className="flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/50">
                <span>VIP Voucher "{promoCode}" Applied</span>
                <span className="font-semibold">-{formatPrice(totals.discount)}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs text-neutral-400 pt-2 border-t border-[#1C1C24]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white tabular-nums">{formatPrice(totals.subtotal)}</span>
              </div>
              {totals.productSavings > 0 && (
                <div className="flex justify-between text-[#E6C25B]">
                  <span>Product Discounts</span>
                  <span className="tabular-nums">-{formatPrice(totals.productSavings)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>VIP Coupon Discount</span>
                  <span className="tabular-nums">-{formatPrice(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Armored White-Glove Shipping</span>
                <span className="text-white tabular-nums">
                  {totals.shippingFee === 0 ? 'Complimentary' : formatPrice(totals.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Luxury Import Tax</span>
                <span className="text-white tabular-nums">{formatPrice(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#262632]">
                <span>Total Acquisition</span>
                <span className="text-gold-gradient tabular-nums">{formatPrice(totals.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={viewFullCart}
                className="py-3 px-3 bg-[#181820] hover:bg-[#22222D] text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                View Full Bag
              </button>
              <button
                onClick={proceedToCheckout}
                className="py-3 px-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
