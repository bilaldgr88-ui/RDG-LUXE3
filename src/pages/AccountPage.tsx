import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { formatPrice } from '../utils/pricing';
import { User, Package, Shield, MapPin, Phone, Mail, LogOut, Truck, Clock, CheckCircle2 } from 'lucide-react';

interface AccountPageProps {
  initialTab?: 'orders' | 'profile';
}

export const AccountPage: React.FC<AccountPageProps> = ({ initialTab = 'orders' }) => {
  const { user, logout, orders, currentPage, setCurrentPage, viewProduct } = useShop();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>(
    currentPage === 'orders' ? 'orders' : initialTab
  );

  React.useEffect(() => {
    if (currentPage === 'orders') {
      setActiveTab('orders');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [currentPage, initialTab]);

  if (!user) {
    return (
      <div className="py-24 text-center bg-[#08080A] min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 bg-[#0F0F14] border border-[#24242E] rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-[#171720] border border-[#2A2A38] text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="font-brand text-2xl font-bold text-white mb-2">
            {currentPage === 'orders' ? 'Order History & Manifests' : 'Private Client Access Required'}
          </h2>
          <p className="text-xs text-neutral-400 mb-6 font-light">
            {currentPage === 'orders'
              ? 'Please sign in to inspect your past acquisitions, download serialized tax manifests, and track white-glove armored couriers.'
              : 'Please sign in to inspect your acquisition manifests, track armored couriers, or manage your personal profile.'}
          </p>
          <button
            onClick={() => setCurrentPage('login')}
            className="w-full py-3 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer hover:bg-[#E6C25B] transition-colors"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  // Filter orders relevant to this user if not admin
  const userOrders = user.role === 'admin'
    ? orders
    : orders.filter((o) => o.customer.email.toLowerCase() === user.email.toLowerCase());

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
          <span className="text-[#D4AF37] font-medium">My Private Portfolio</span>
        </div>

        {/* User Badge Banner */}
        <div className="p-6 sm:p-8 bg-[#0E0E13] border border-[#24242E] rounded-3xl mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#886611] flex items-center justify-center text-black font-bold text-xl font-brand shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              {user.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-brand text-2xl font-bold text-white">{user.name}</h1>
                {user.role === 'admin' && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] rounded font-bold">
                    Maison Director
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">{user.email}</div>
              <div className="text-[11px] text-[#E6C25B] font-medium mt-1">
                Tier: Sovereign VIP Circle Member · Account Active
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button
                onClick={() => setCurrentPage('admin')}
                className="px-4 py-2.5 bg-[#1C1814] hover:bg-[#28221B] border border-[#D4AF37]/50 text-xs font-semibold text-[#D4AF37] rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Suite</span>
              </button>
            )}
            <button
              onClick={logout}
              className="px-4 py-2.5 bg-[#16161D] hover:bg-[#22222A] text-xs font-semibold text-neutral-300 hover:text-red-400 rounded-xl border border-[#282833] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#1E1E26] gap-5 sm:gap-8 mb-8 text-xs font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'orders'
                ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Acquisition & Order History ({userOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Client Profile & Delivery Vault</span>
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {userOrders.length === 0 ? (
              <div className="py-16 text-center bg-[#0E0E13] border border-[#22222B] rounded-3xl p-8">
                <Package className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h3 className="font-brand text-lg font-bold text-white">No Previous Acquisitions</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 font-light">
                  When you acquire timepieces or bespoke garments, your serialized invoices and armored tracking transponders will appear here.
                </p>
                <button
                  onClick={() => setCurrentPage('shop')}
                  className="mt-6 px-6 py-2.5 bg-[#D4AF37] text-black text-xs font-semibold rounded-xl"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              userOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0E0E13] border border-[#24242E] rounded-3xl p-5 sm:p-8 shadow-xl"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1E1E26] gap-4">
                    <div>
                      <div className="text-[11px] text-neutral-500 font-mono">ORDER IDENTIFIER</div>
                      <div className="text-base font-bold text-white font-mono">{order.orderNumber}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <div className="text-[11px] text-neutral-500 font-mono">DISPATCH STATUS</div>
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{order.orderStatus}</span>
                        </div>
                      </div>
                      <div className="bg-[#14141A] px-3.5 py-2 rounded-xl border border-[#2B2B36]">
                        <div className="text-[10px] text-neutral-500 font-mono uppercase">Armored Tracking</div>
                        <div className="text-xs font-semibold text-[#D4AF37] font-mono flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{order.trackingNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Products */}
                  <div className="py-6 border-b border-[#1E1E26] space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            onClick={() => viewProduct(item.productId)}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[#2A2A34] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <h4
                              onClick={() => viewProduct(item.productId)}
                              className="font-brand text-sm font-semibold text-white hover:text-gold-gradient transition-colors cursor-pointer truncate"
                            >
                              {item.name}
                            </h4>
                            <div className="text-xs text-neutral-400 mt-0.5">
                              Quantity: {item.quantity} {item.selectedSize && `· Size: ${item.selectedSize}`} {item.selectedColor && `· ${item.selectedColor}`}
                            </div>
                          </div>
                        </div>

                        <span className="text-sm font-bold text-white tabular-nums shrink-0">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals & Notes */}
                  <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="text-neutral-400">
                      <span>Settlement: </span>
                      <strong className="text-white">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery (Armored)' : 'Card Simulator (DEMO ONLY)'}
                      </strong>
                      <span className="ml-2 uppercase text-[10px] font-mono text-yellow-400">
                        [{order.paymentStatus === 'demo_unpaid' ? 'DEMO ONLY' : order.paymentStatus}]
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-neutral-400">Total Manifest:</span>
                      <span className="text-xl font-bold text-gold-gradient tabular-nums">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-[#0E0E13] border border-[#24242E] rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl">
            <h2 className="font-brand text-xl font-bold text-white mb-6">
              Personal Concierge Profile
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#141419] rounded-2xl border border-[#22222B] flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider block font-medium">Legal Name</span>
                  <span className="text-white font-semibold text-sm">{user.name}</span>
                </div>
                <User className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div className="p-4 bg-[#141419] rounded-2xl border border-[#22222B] flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider block font-medium">Private Email</span>
                  <span className="text-white font-semibold text-sm">{user.email}</span>
                </div>
                <Mail className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div className="p-4 bg-[#141419] rounded-2xl border border-[#22222B] flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider block font-medium">Contact Phone</span>
                  <span className="text-white font-semibold text-sm">{user.phone || '+1 (212) 555-0188'}</span>
                </div>
                <Phone className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div className="p-4 bg-[#141419] rounded-2xl border border-[#22222B] flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 uppercase tracking-wider block font-medium">Private Vault Address</span>
                  <span className="text-white font-semibold text-sm">{user.address || '834 Fifth Avenue, Suite 9'}</span>
                  <span className="text-neutral-400 block">{user.city || 'New York'}, {user.postalCode || '10065'}</span>
                </div>
                <MapPin className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
