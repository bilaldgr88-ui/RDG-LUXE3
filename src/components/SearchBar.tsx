import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, X, ArrowUpRight, Sparkles } from 'lucide-react';
import { formatPrice, getDiscountPercentage, getEffectivePrice, hasActiveDiscount } from '../utils/pricing';

interface SearchBarProps {
  autoFocus?: boolean;
  onSelectProduct?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ autoFocus = false, onSelectProduct }) => {
  const { products, viewProduct, setCurrentPage, setSearchQuery: setGlobalSearch } = useShop();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching suggestions
  const trimmed = query.trim().toLowerCase();
  const filteredSuggestions = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!trimmed) return true;
    return (
      p.name.toLowerCase().includes(trimmed) ||
      p.subtitle.toLowerCase().includes(trimmed) ||
      p.categoryLabel.toLowerCase().includes(trimmed) ||
      p.sku.toLowerCase().includes(trimmed)
    );
  }).slice(0, 5);

  const handleSelect = (productId: string) => {
    setIsFocused(false);
    viewProduct(productId);
    if (onSelectProduct) onSelectProduct();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setGlobalSearch(query.trim());
      setCurrentPage('shop');
      setIsFocused(false);
      if (onSelectProduct) onSelectProduct();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      {/* Search Input Box */}
      <form
        onSubmit={handleSearchSubmit}
        className={`relative flex items-center bg-[#0F0F13] border transition-all duration-300 rounded-2xl shadow-xl overflow-hidden ${
          isFocused ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-[0_0_25px_rgba(212,175,55,0.2)]' : 'border-[#282830]'
        }`}
      >
        {/* Category Selector Dropdown */}
        <div className="hidden sm:flex items-center pl-4 pr-2 border-r border-[#24242C]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-xs font-medium text-neutral-300 focus:outline-none cursor-pointer py-2 pr-1"
            aria-label="Category filter"
          >
            <option value="all" className="bg-[#141419] text-white">All Categories</option>
            <option value="men" className="bg-[#141419] text-white">Men's Tailoring</option>
            <option value="women" className="bg-[#141419] text-white">Women's Couture</option>
            <option value="watches" className="bg-[#141419] text-white">Luxury Watches</option>
          </select>
        </div>

        {/* Search Icon */}
        <div className="pl-3.5 sm:pl-4 pr-1.5 sm:pr-2 text-[#D4AF37] shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search garments, watches, SKUs..."
          autoFocus={autoFocus}
          className="flex-1 min-w-0 py-3.5 sm:py-4 px-2 bg-transparent text-xs sm:text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none font-light"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="p-2 text-neutral-400 hover:text-white mr-1 sm:mr-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="m-1.5 px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38D1B] hover:opacity-95 text-black font-semibold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer hidden sm:flex items-center gap-1.5 shrink-0"
        >
          <span>Search</span>
        </button>
      </form>

      {/* Popular Suggestions quick links */}
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2 px-1 sm:px-2 text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 text-neutral-500">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Trending:</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {['Chronograph 18K', 'Sartorial Tuxedo', 'Tourbillon', 'Velvet Gown', 'Cashmere'].map((term) => (
            <button
              key={term}
              onClick={() => {
                setQuery(term);
                setGlobalSearch(term);
                setCurrentPage('shop');
              }}
              className="text-neutral-300 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#121217] border border-[#2F2F3B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 bg-[#0D0D10] border-b border-[#22222A] flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium uppercase tracking-wider text-[11px] text-[#D4AF37]">
              {trimmed ? `Matching Results (${filteredSuggestions.length})` : 'Curated Highlights'}
            </span>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">Press Enter to view all</span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#1F1F27]">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((product) => {
                const discounted = hasActiveDiscount(product);
                const effPrice = getEffectivePrice(product);
                const pct = getDiscountPercentage(product);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product.id)}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#1A1A22] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-lg border border-[#2B2B33] group-hover:border-[#D4AF37]/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-neutral-100 group-hover:text-[#E6C25B] transition-colors truncate">
                          {product.name}
                        </div>
                        <div className="text-[11px] sm:text-xs text-neutral-400 font-light line-clamp-1">
                          {product.subtitle}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5 truncate">
                          {product.categoryLabel} · SKU: {product.sku}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2 sm:gap-3">
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-neutral-200 tabular-nums block">
                          {formatPrice(effPrice)}
                        </span>
                        {discounted && product.originalPrice && (
                          <span className="text-[10px] text-neutral-500 line-through tabular-nums block">
                            {formatPrice(product.originalPrice)} (-{pct}%)
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-[#D4AF37] transition-colors hidden sm:block" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-neutral-400">
                No luxury items matching "{query}". Try searching "Chronograph" or "Tuxedo".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
