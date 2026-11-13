import React from 'react';
import { useShop } from '../context/ShopContext';
import { PageView } from '../types';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CollectionCardData {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  image: string;
  page: PageView;
}

export const FeaturedCollections: React.FC = () => {
  const { setCurrentPage } = useShop();

  const collections: CollectionCardData[] = [
    {
      id: 'men',
      title: "Men's Collection",
      subtitle: 'Sartorial Italian Tailoring',
      tagline: 'Super 160s Virgin Wool & Silk Faille',
      image: '/src/assets/images/men_collection_suit_1794494077378.jpg',
      page: 'men',
    },
    {
      id: 'women',
      title: "Women's Collection",
      subtitle: 'Architectural Evening Couture',
      tagline: 'Hand-Embroidered Velvet & Mulberry Silks',
      image: '/src/assets/images/women_evening_dress_1794494078742.jpg',
      page: 'women',
    },
    {
      id: 'watches',
      title: 'Luxury Watches',
      subtitle: 'Haute Horlogerie & Chronographs',
      tagline: '18K Solid Gold & Flying Tourbillons',
      image: '/src/assets/images/watch_rose_gold_1794494079347.jpg',
      page: 'watches',
    },
    {
      id: 'new-arrivals',
      title: 'New Arrivals',
      subtitle: 'The 2026 Atelier Premiere',
      tagline: 'Limited Production Masterpieces',
      image: '/src/assets/images/watch_black_diamond_1794494079598.jpg',
      page: 'new-arrivals',
    },
  ];

  return (
    <section className="py-20 bg-[#08080B] border-b border-[#1C1C22]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Signature Pillars</span>
            </div>
            <h2 className="font-brand text-3xl sm:text-4xl font-bold tracking-wider text-neutral-100">
              Featured Collections
            </h2>
          </div>
          <p className="text-sm text-neutral-400 max-w-md font-light leading-relaxed">
            Every garment and timepiece is handcrafted in strictly limited numbers, honoring centuries of European atelier tradition.
          </p>
        </div>

        {/* 4 Large Luxury Collection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {collections.map((col) => (
            <div
              key={col.id}
              onClick={() => {
                setCurrentPage(col.page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group relative h-[420px] sm:h-[460px] rounded-2xl overflow-hidden border border-[#262630] hover:border-[#D4AF37]/70 transition-all duration-500 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.25)] flex flex-col justify-end p-6"
            >
              {/* Background High-Res Image */}
              <img
                src={col.image}
                alt={col.title}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Scrim Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />

              {/* Content Box */}
              <div className="relative z-10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#F3E5AB] font-semibold">
                  {col.subtitle}
                </span>
                <h3 className="font-brand text-2xl font-bold text-white mt-1 group-hover:text-gold-gradient transition-colors">
                  {col.title}
                </h3>
                <p className="text-xs text-neutral-300 mt-2 line-clamp-1 font-light">
                  {col.tagline}
                </p>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#D4AF37] group-hover:underline">
                    Explore Line
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#D4AF37] text-white group-hover:text-black flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
