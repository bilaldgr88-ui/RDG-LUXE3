import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import { ProductCategory } from '../types';
import { getEffectivePrice, hasActiveDiscount } from '../utils/pricing';
import { SlidersHorizontal, Search, ArrowUpDown, X, Sparkles } from 'lucide-react';

interface ShopPageProps {
  forcedCategory?: ProductCategory;
  filterType?: 'new' | 'bestseller' | 'offer';
  customTitle?: string;
  customDescription?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  forcedCategory,
  filterType,
  customTitle,
  customDescription,
}) => {
  const { products, searchQuery, setSearchQuery, setCurrentPage } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<string>(forcedCategory || 'all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Sync category if forced
  React.useEffect(() => {
    if (forcedCategory) {
      setSelectedCategory(forcedCategory);
    }
  }, [forcedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (forcedCategory) {
        if (p.category !== forcedCategory) return false;
      } else if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Special Filter type
      if (filterType === 'new' && !p.isNewArrival) return false;
      if (filterType === 'bestseller' && !p.isBestSeller) return false;
      if (filterType === 'offer' && !p.isSpecialOffer && !hasActiveDiscount(p)) return false;

      // In stock
      if (inStockOnly && !p.inStock) return false;

      // Price range using authoritative effective price
      const effective = getEffectivePrice(p);
      if (priceRange === 'under2500' && effective >= 2500) return false;
      if (priceRange === '2500to5000' && (effective < 2500 || effective > 5000)) return false;
      if (priceRange === 'over5000' && effective <= 5000) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return getEffectivePrice(a) - getEffectivePrice(b);
      if (sortBy === 'price_desc') return getEffectivePrice(b) - getEffectivePrice(a);
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // featured default
    });
  }, [products, forcedCategory, selectedCategory, filterType, inStockOnly, priceRange, searchQuery, sortBy]);

  const pageTitle =
    customTitle ||
    (forcedCategory === 'men'
      ? "Men's Sartorial Collection"
      : forcedCategory === 'women'
      ? "Women's Evening Couture"
      : forcedCategory === 'watches'
      ? 'Swiss Haute Horlogerie'
      : filterType === 'new'
      ? 'New Arrivals (2026 Collection)'
      : filterType === 'bestseller'
      ? 'Iconic Best Sellers'
      : filterType === 'offer'
      ? 'Private Atelier Offers'
      : 'All Luxury Creations');

  const pageDesc =
    customDescription ||
    (forcedCategory === 'men'
      ? 'Hand-canvassed Italian wool tuxedos, silk-lapel jackets, and pure cashmere overcoats.'
      : forcedCategory === 'women'
      ? 'Architectural evening gowns, gilded velvet blazers, and pure bias-cut mulberry silks.'
      : forcedCategory === 'watches'
      ? 'Masterpiece 18K solid gold chronographs, flying tourbillons, and perpetual calendar movements.'
      : 'Discover the complete catalogue of bespoke apparel and haute horlogerie by Maison RGD LUXE.');

  return (
    <div className="py-12 sm:py-16 bg-[#09090C] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-6">
          <button
            onClick={() => setCurrentPage('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="text-[#D4AF37] font-medium">{pageTitle}</span>
        </div>

        {/* Page Header */}
        <div className="mb-10 pb-8 border-b border-[#1E1E26]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Maison RGD LUXE Catalogue</span>
          </div>
          <h1 className="font-brand text-3xl sm:text-5xl font-bold tracking-wide text-white">
            {pageTitle}
          </h1>
          <p className="mt-3 text-sm text-neutral-400 max-w-2xl font-light leading-relaxed">
            {pageDesc}
          </p>
        </div>

        {/* Filter & Sort Controls Toolbar */}
        <div className="bg-[#0F0F14] border border-[#22222B] rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs (if not forced) */}
          {!forcedCategory && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Catalog' },
                { id: 'men', label: "Men's" },
                { id: 'women', label: "Women's" },
                { id: 'watches', label: 'Watches' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#D4AF37] text-black font-semibold'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1A1A22]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Query within shop */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#141419] border border-[#2B2B36] rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Price Range Filter & Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="bg-[#141419] border border-[#2B2B36] rounded-lg py-1.5 px-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                aria-label="Price range filter"
              >
                <option value="all">All Price Tiers</option>
                <option value="under2500">Under $2,500</option>
                <option value="2500to5000">$2,500 – $5,000</option>
                <option value="over5000">Over $5,000</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#141419] border border-[#2B2B36] rounded-lg py-1.5 px-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                aria-label="Sort products"
              >
                <option value="featured">Featured Curations</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Collector Rating</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-[#2B2B36] bg-[#141419] text-[#D4AF37] focus:ring-0"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Product Count & Active Filters Indicator */}
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-6">
          <div>
            Showing <span className="text-white font-semibold tabular-nums">{filteredProducts.length}</span> pieces
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2">
              <span>Matching "{searchQuery}"</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#D4AF37] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="p-16 bg-[#0E0E12] border border-[#202028] rounded-2xl text-center">
            <h3 className="font-brand text-lg font-bold text-white">No creations match the selected filters</h3>
            <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto">
              Please adjust your search terms or price filter criteria to view our available luxury inventory.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setPriceRange('all');
                setSearchQuery('');
                setInStockOnly(false);
              }}
              className="mt-6 px-6 py-2.5 bg-[#1A1A22] hover:bg-[#252530] text-[#D4AF37] text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
