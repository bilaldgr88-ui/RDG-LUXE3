import React from 'react';
import { useShop } from '../context/ShopContext';
import { formatPrice } from '../utils/pricing';
import { CheckCircle2, Truck, ShieldCheck, Printer, ArrowRight, Package } from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { lastOrder, setCurrentPage } = useShop();

  if (!lastOrder) {
    return (
      <div className="py-24 text-center bg-[#09090C] min-h-screen">
        <div className="max-w-md mx-auto p-8 bg-[#0F0F14] border border-[#22222B] rounded-3xl">
          <h2 className="font-brand text-xl font-bold text-white mb-2">No Recent Order Found</h2>
          <p className="text-xs text-neutral-400 mb-6">Explore our curated collections or visit your order history.</p>
          <button
            onClick={() => setCurrentPage('shop')}
            className="px-6 py-2.5 bg-[#D4AF37] text-black text-xs font-semibold rounded-xl"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-12 sm:py-20 bg-[#08080A] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#D4AF37]">
            Acquisition Confirmed
          </span>
          <h1 className="font-brand text-3xl sm:text-4xl font-bold text-white mt-1">
            Thank You, {lastOrder.customer.name}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 font-light">
            Your acquisition manifest has been transferred to our Geneva vault logistics team for white-glove armored dispatch.
          </p>
        </div>

        {/* Tracking & Receipt Box */}
        <div className="bg-[#0E0E13] border border-[#24242E] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1E1E26] gap-4">
            <div>
              <div className="text-xs text-neutral-500 font-mono">ORDER IDENTIFIER</div>
              <div className="text-lg font-bold text-white font-mono">{lastOrder.orderNumber}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 font-mono">ARMORED COURIER CODE</div>
              <div className="text-sm font-semibold text-[#D4AF37] font-mono flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>{lastOrder.trackingNumber}</span>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 bg-[#16161D] rounded-lg border border-[#2B2B36] cursor-pointer self-start sm:self-center"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
          </div>

          {/* Delivery & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#1E1E26] text-xs">
            <div>
              <span className="text-neutral-500 uppercase tracking-wider block font-semibold mb-1">
                Dispatch Destination
              </span>
              <div className="text-white font-medium">{lastOrder.customer.name}</div>
              <div className="text-neutral-400 mt-0.5">{lastOrder.customer.address}</div>
              <div className="text-neutral-400">{lastOrder.customer.city}, {lastOrder.customer.postalCode}</div>
              <div className="text-neutral-400">{lastOrder.customer.phone}</div>
            </div>
            <div>
              <span className="text-neutral-500 uppercase tracking-wider block font-semibold mb-1">
                Settlement & Dispatch State
              </span>
              <div className="text-white font-medium">
                Method: {lastOrder.paymentMethod === 'cod' ? 'Cash on Delivery (White-Glove)' : 'Card Simulator (DEMO ONLY)'}
              </div>
              <div className="text-neutral-400 mt-1">
                Status: <span className="text-emerald-400 font-semibold">{lastOrder.orderStatus}</span>
              </div>
              <div className="text-neutral-400 mt-1">
                Payment: <span className="text-yellow-400 uppercase font-mono text-[11px]">
                  {lastOrder.paymentStatus === 'demo_unpaid' ? 'DEMO ONLY (NOT CHARGED)' : lastOrder.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Products */}
          <div className="py-6 border-b border-[#1E1E26]">
            <span className="text-neutral-500 uppercase tracking-wider block font-semibold text-xs mb-4">
              Acquired Masterpieces ({lastOrder.items.length})
            </span>
            <div className="space-y-4">
              {lastOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-[#282833]"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.name}</h4>
                      <div className="text-[11px] text-neutral-400">
                        Qty: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 space-y-2 text-xs text-neutral-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-white tabular-nums">{formatPrice(lastOrder.subtotal)}</span>
            </div>
            {lastOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>VIP Privilege Savings</span>
                <span className="tabular-nums">-{formatPrice(lastOrder.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Armored Courier Service</span>
              <span className="text-white tabular-nums">
                {lastOrder.shippingFee === 0 ? 'Complimentary' : formatPrice(lastOrder.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Excise Tax</span>
              <span className="text-white tabular-nums">{formatPrice(lastOrder.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-[#202028]">
              <span>Final Acquisition Amount</span>
              <span className="text-gold-gradient tabular-nums text-xl">
                {formatPrice(lastOrder.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => {
              setCurrentPage('account');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-6 py-3 bg-[#16161D] hover:bg-[#202028] text-xs font-semibold text-neutral-200 rounded-xl border border-[#2B2B36] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#D4AF37]" />
            <span>View in Order History</span>
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] hover:opacity-90 text-black text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Return to Maison Showcase</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Security Note */}
        <div className="mt-8 p-4 bg-[#0A0A0E] border border-[#1E1E26] rounded-2xl flex items-center justify-center gap-2 text-xs text-neutral-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Demo Transaction Logged: Validated with Server-Side Database Persistence</span>
        </div>
      </div>
    </div>
  );
};
