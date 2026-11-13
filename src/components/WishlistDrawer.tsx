import React from 'react';
import { useShop } from '../context/ShopContext';
import { formatPrice, getEffectivePrice, hasActiveDiscount } from '../utils/pricing';
import { X, Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({ isOpen, onClose }) => {
  const { wishlist, products, toggleWishlist, addToCart, viewProduct, setCurrentPage, setIsCartDrawerOpen } = useShop();

  if (!isOpen) return null;

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#0D0D11] border-l border-[#24242D] h-full flex flex-col justify-between overflow-hidden z-10 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-[#202028] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
            <h2 className="font-brand text-lg font-bold text-white tracking-wide">
              Saved Masterpieces ({wishlistProducts.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close wishlist"
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-[#181820]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#1D1D26]">
          {wishlistProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#15151C] border border-[#2B2B36] flex items-center justify-center text-neutral-500 mb-4">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-brand text-lg font-semibold text-white">
                Your Wishlist is Empty
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs mt-1 font-light">
                Click the heart icon on any bespoke piece or mechanical timepiece to curate your private selection.
              </p>
              <button
                onClick={() => {
                  onClose();
                  setCurrentPage('shop');
                }}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] text-black text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Discover Creations
              </button>
            </div>
          ) : (
            wishlistProducts.map((p) => {
              const effPrice = getEffectivePrice(p);
              const discounted = hasActiveDiscount(p);
              return (
              <div key={p.id} className="py-4 flex gap-4">
                <img
                  src={p.image}
                  alt={p.name}
                  onClick={() => {
                    onClose();
                    viewProduct(p.id);
                  }}
                  className="w-20 h-20 object-cover rounded-xl border border-[#2B2B36] shrink-0 cursor-pointer"
                />

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        onClick={() => {
                          onClose();
                          viewProduct(p.id);
                        }}
                        className="font-brand text-sm font-semibold text-white hover:text-[#E6C25B] transition-colors cursor-pointer line-clamp-1"
                      >
                        {p.name}
                      </h4>
                      <button
                        onClick={() => toggleWishlist(p.id)}
                        aria-label="Remove from wishlist"
                        className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                      {p.subtitle}
                    </div>

                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-xs font-bold text-white tabular-nums">
                        {formatPrice(effPrice)}
                      </span>
                      {discounted && p.originalPrice && (
                        <span className="text-[11px] text-neutral-500 line-through tabular-nums">
                          {formatPrice(p.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        addToCart(p, 1);
                        onClose();
                        setIsCartDrawerOpen(true);
                      }}
                      className="flex-1 py-1.5 px-3 bg-[#1A1A22] hover:bg-[#D4AF37] hover:text-black border border-[#2B2B36] hover:border-[#D4AF37] text-neutral-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Move to Bag</span>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        viewProduct(p.id);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white"
                      title="View Details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {wishlistProducts.length > 0 && (
          <div className="p-5 border-t border-[#202028] bg-[#0A0A0E]">
            <button
              onClick={() => {
                wishlistProducts.forEach((p) => addToCart(p, 1));
                onClose();
                setIsCartDrawerOpen(true);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-lg hover:opacity-95 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-black" />
              <span>Acquire All to Bag ({wishlistProducts.length})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
