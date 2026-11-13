import React from 'react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import {
  formatPrice,
  getDiscountPercentage,
  getEffectivePrice,
  getNormalizedGallery,
  hasActiveDiscount,
} from '../utils/pricing';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { viewProduct, addToCart, wishlist, toggleWishlist } = useShop();

  const isSaved = wishlist.includes(product.id);
  const gallery = getNormalizedGallery(product);
  const mainImage = gallery[0] || product.image;
  const discounted = hasActiveDiscount(product);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);

  return (
    <div className="group relative flex flex-col bg-[#0F0F13] border border-[#24242C] hover:border-[#D4AF37]/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      {/* Product Image Frame */}
      <div
        onClick={() => viewProduct(product.id)}
        className="relative w-full aspect-[4/3] bg-[#0A0A0C] overflow-hidden cursor-pointer"
      >
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Subtle Gradient Scrim at bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Wishlist Button Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-10 ${
            isSaved
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Status & Discount indicators top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {discounted && (
            <span className="text-[10px] uppercase tracking-wider font-bold text-black bg-[#D4AF37] px-2 py-0.5 rounded shadow-sm">
              {discountPct}% OFF
            </span>
          )}
          {product.isNewArrival && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#F3E5AB] bg-black/75 backdrop-blur-md px-2 py-0.5 rounded border border-[#D4AF37]/40">
              New Arrival
            </span>
          )}
          {product.isSpecialOffer && !discounted && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D4AF37] bg-black/75 backdrop-blur-md px-2 py-0.5 rounded border border-[#D4AF37]/40">
              Private Offer
            </span>
          )}
        </div>

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              viewProduct(product.id);
            }}
            className="w-full py-2 bg-neutral-900/90 hover:bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-xl backdrop-blur-md border border-neutral-700 hover:border-[#D4AF37] transition-all flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>View Masterpiece Details</span>
          </button>
        </div>
      </div>

      {/* Card Info Section */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Unboxed Metadata */}
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5 gap-2">
            <span className="uppercase tracking-[0.12em] text-[10px] sm:text-[11px] font-medium text-neutral-400 truncate">
              {product.categoryLabel}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#E6C25B] shrink-0">
              <Star className="w-3 h-3 fill-current text-[#D4AF37]" />
              <span className="tabular-nums font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-neutral-500">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => viewProduct(product.id)}
            className="font-brand text-base sm:text-lg font-semibold text-neutral-100 group-hover:text-gold-gradient transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>

          {/* Subtitle / Spec */}
          <p className="text-xs text-neutral-400 font-light mt-1 line-clamp-1">
            {product.subtitle}
          </p>

          {/* Available Sizes or Dimensions */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span className="text-neutral-500">Sizes:</span>
              <span className="text-neutral-300 font-mono text-[10px] truncate">
                {product.sizes.join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Price & Buy Action */}
        <div className="mt-4 pt-4 border-t border-[#1F1F27] flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold text-white tabular-nums">
                {formatPrice(effectivePrice)}
              </span>
              {discounted && product.originalPrice && (
                <span className="text-xs text-neutral-500 line-through tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 ${product.inStock ? 'text-emerald-400' : 'text-neutral-500'}`}>
              {product.inStock ? `In Stock (${product.stockCount} available)` : 'Made to Order'}
            </span>
          </div>

          {/* Add to Bag Button */}
          <button
            onClick={() => addToCart(product, 1)}
            aria-label={`Add ${product.name} to shopping bag`}
            className="p-2.5 bg-[#181820] hover:bg-[#D4AF37] text-neutral-200 hover:text-black rounded-xl border border-[#2E2E38] hover:border-[#D4AF37] transition-all cursor-pointer group/btn shrink-0"
          >
            <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
