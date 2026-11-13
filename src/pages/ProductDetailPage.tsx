import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import {
  formatPrice,
  getDiscountPercentage,
  getEffectivePrice,
  getNormalizedGallery,
  hasActiveDiscount,
} from '../utils/pricing';
import { ProductCard } from '../components/ProductCard';
import {
  ShoppingBag,
  Heart,
  Shield,
  Truck,
  RotateCcw,
  Star,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProductId,
    products,
    isLoadingProducts,
    addToCart,
    wishlist,
    toggleWishlist,
    setCurrentPage,
    setIsCartDrawerOpen,
  } = useShop();

  const matchedProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : undefined;
  const product = matchedProduct || (!isLoadingProducts ? products[0] : undefined);

  const [selectedSize, setSelectedSize] = useState<string>(
    product?.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product?.colors && product.colors.length > 0 ? product.colors[0].name : ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'composition' | 'delivery'>('details');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Sync selections whenever product changes
  useEffect(() => {
    if (!product) return;
    setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
    setSelectedColor(product.colors && product.colors.length > 0 ? product.colors[0].name : '');
    setQuantity(1);
    setActiveImageIndex(0);
  }, [product?.id]);

  if (isLoadingProducts && selectedProductId && !matchedProduct) {
    return (
      <div className="py-24 bg-[#08080A] min-h-screen flex items-center justify-center">
        <div className="text-center text-xs text-neutral-400">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin mx-auto mb-3" />
          <span>Loading masterpiece...</span>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const gallery = getNormalizedGallery(product);
  const safeIdx = activeImageIndex < gallery.length ? activeImageIndex : 0;
  const activeImageSrc = gallery[safeIdx] || product.image;

  const discounted = hasActiveDiscount(product);
  const effectivePrice = getEffectivePrice(product);
  const discountPct = getDiscountPercentage(product);
  const isSaved = wishlist.includes(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
    setIsCartDrawerOpen(true);
  };

  const handlePrevImage = () => {
    if (gallery.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const handleNextImage = () => {
    if (gallery.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % gallery.length);
  };

  // Related products from same category
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="py-8 sm:py-16 bg-[#08080A] min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6 sm:mb-8 flex-wrap">
          <button
            onClick={() => setCurrentPage('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <button
            onClick={() => setCurrentPage(product.category as any)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            {product.categoryLabel}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-[#D4AF37] font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
        </div>

        {/* PDP Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-start">
          {/* Left Column: High-Res Multi-Image Product Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4 min-w-0">
            <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square w-full rounded-2xl overflow-hidden bg-[#0D0D11] border border-[#24242D] shadow-2xl">
              <img
                src={activeImageSrc}
                alt={`${product.name} — View ${safeIdx + 1}`}
                className="w-full h-full object-cover object-center transition-opacity duration-300"
              />

              {/* Status & Discount Tags */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-10">
                {discounted && (
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-black bg-[#D4AF37] px-2.5 sm:px-3 py-1 rounded shadow-md">
                    {discountPct}% OFF
                  </span>
                )}
                {product.isNewArrival && (
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-[#F3E5AB] bg-black/80 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded border border-[#D4AF37]/50">
                    Atelier 2026 Premiere
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-[#D4AF37] bg-black/80 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded border border-[#D4AF37]/50">
                    Iconic Best Seller
                  </span>
                )}
              </div>

              {/* Prev / Next Carousel Buttons when multiple images exist */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label="Previous product image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/75 hover:bg-[#D4AF37] text-white hover:text-black border border-white/15 flex items-center justify-center transition-all cursor-pointer z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="Next product image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/75 hover:bg-[#D4AF37] text-white hover:text-black border border-white/15 flex items-center justify-center transition-all cursor-pointer z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter & Origin Seal */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-center justify-between gap-2 pointer-events-none">
                {gallery.length > 1 ? (
                  <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-mono text-[#E6C25B]">
                    {safeIdx + 1} / {gallery.length}
                  </span>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/85 backdrop-blur-md rounded-full border border-white/10 text-[10px] sm:text-[11px] text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  <span className="truncate max-w-[180px] sm:max-w-none">Swiss / Italian Craftsmanship</span>
                </div>
              </div>
            </div>

            {/* Interactive Thumbnail Gallery Strip (Only real product images — zero fake placeholders) */}
            {gallery.length > 1 && (
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View product image ${idx + 1}`}
                    className={`relative shrink-0 w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-[#121217] ${
                      safeIdx === idx
                        ? 'border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                        : 'border-[#22222B] opacity-75 hover:opacity-100 hover:border-neutral-500'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-5 flex flex-col min-w-0">
            <div className="bg-[#0F0F14] border border-[#24242E] rounded-3xl p-5 sm:p-8 shadow-xl">
              {/* Category & Rating */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 mb-2">
                <span className="uppercase tracking-[0.2em] font-medium text-[#D4AF37]">
                  {product.categoryLabel}
                </span>
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Star className="w-3.5 h-3.5 fill-current text-[#D4AF37]" />
                  <span className="font-semibold text-white tabular-nums">{product.rating.toFixed(1)}</span>
                  <span className="text-neutral-500">
                    ({product.reviewsCount} {product.isDemo ? 'demo ratings' : 'collector reviews'})
                  </span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-brand text-xl sm:text-3xl font-bold text-white tracking-wide break-words">
                {product.name}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-light leading-relaxed">
                {product.subtitle}
              </p>

              {/* Price & Stock */}
              <div className="mt-6 pb-6 border-b border-[#202028] flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {formatPrice(effectivePrice)}
                  </span>
                  {discounted && product.originalPrice && (
                    <>
                      <span className="text-sm text-neutral-500 line-through tabular-nums">
                        {formatPrice(product.originalPrice)}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-[#D4AF37]/20 text-[#E6C25B] border border-[#D4AF37]/40 rounded">
                        Save {discountPct}%
                      </span>
                    </>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <span className={`text-xs font-medium ${product.inStock ? 'text-emerald-400' : 'text-neutral-500'}`}>
                    {product.inStock ? `In Stock (${product.stockCount} remaining)` : 'Backordered'}
                  </span>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    SKU: {product.sku}
                  </div>
                </div>
              </div>

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2.5 gap-2">
                    <span className="font-medium text-neutral-300">Bespoke Finish / Color:</span>
                    <span className="text-white font-semibold truncate">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          selectedColor === c.name
                            ? 'border-[#D4AF37] bg-[#1C1C24] text-white shadow-sm'
                            : 'border-[#262630] bg-[#121217] text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs font-medium">{c.name}</span>
                        {selectedColor === c.name && <Check className="w-3 h-3 text-[#D4AF37]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2.5">
                    <span className="font-medium text-neutral-300">
                      {product.category === 'watches' ? 'Case Diameter:' : 'Sartorial Size:'}
                    </span>
                    <span className="text-[#D4AF37] text-[11px]">
                      Atelier Fit Standard
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                          selectedSize === s
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-black font-bold shadow-md'
                            : 'border-[#262630] bg-[#121217] text-neutral-300 hover:border-neutral-500 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Stepper & Buy Action */}
              <div className="mt-8 pt-6 border-t border-[#202028] flex flex-col sm:flex-row gap-3">
                {/* Quantity */}
                <div className="flex items-center justify-between sm:justify-start border border-[#2B2B36] rounded-xl bg-[#14141A] px-2 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    className="p-2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-sm font-semibold text-white tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(Math.max(1, product.stockCount), quantity + 1))}
                    aria-label="Increase quantity"
                    className="p-2 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Add to Cart + Wishlist */}
                <div className="flex flex-1 gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="flex-1 py-3.5 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-black shrink-0" />
                    <span>{product.inStock ? 'Acquire into Bag' : 'Out of Stock'}</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(product.id)}
                    aria-label="Save to wishlist"
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                      isSaved
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                        : 'border-[#2B2B36] bg-[#14141A] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-8 pt-6 border-t border-[#1F1F27] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-400">
                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium block">Armored Delivery</span>
                    <span>Complimentary over $1,000</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium block">5-Year Atelier Warranty</span>
                    <span>Direct Maison backing</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium block">30-Day Discretionary Returns</span>
                    <span>Unworn with security seal</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Star className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium block">Certificate Included</span>
                    <span>Serialized authenticity</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details & Composition Tabs */}
            <div className="mt-6 sm:mt-8 bg-[#0D0D12] border border-[#22222B] rounded-3xl p-5 sm:p-6">
              <div className="flex border-b border-[#1E1E26] gap-4 sm:gap-6 text-xs font-medium overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'details'
                      ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Specification & Details
                </button>
                <button
                  onClick={() => setActiveTab('composition')}
                  className={`pb-3 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'composition'
                      ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Material & Care
                </button>
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`pb-3 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'delivery'
                      ? 'border-b-2 border-[#D4AF37] text-[#E6C25B] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Courier & Security
                </button>
              </div>

              <div className="mt-5 text-xs text-neutral-300 leading-relaxed font-light">
                {activeTab === 'details' && (
                  <div>
                    <p className="mb-4 text-neutral-300">{product.description}</p>
                    <ul className="space-y-2 text-neutral-400">
                      {product.details?.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#D4AF37] mt-0.5">·</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'composition' && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-neutral-400 block font-medium">Composition:</span>
                      <span className="text-white">{product.composition}</span>
                    </div>
                    <p className="text-neutral-400 mt-2">
                      Specialist dry clean only for couture garments. Timepieces require ultrasonic water resistance testing every 24 months at an authorized RGD horology salon.
                    </p>
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <p className="text-neutral-400">
                    Dispatched in discreet, unbranded tamper-evident security packaging with temperature-regulated armored courier service. Requires adult signature with government-issued photo ID upon handover.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Masterpieces */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 sm:mt-20 pt-10 sm:pt-12 border-t border-[#1C1C24]">
            <h2 className="font-brand text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
              Complementary Masterpieces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
