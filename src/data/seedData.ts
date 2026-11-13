import type { Product, Order } from '../types/index.ts';
import { calculatePercentFromPrices } from '../utils/pricing.ts';

const RAW_SEED_PRODUCTS: Omit<Product, 'images' | 'discountEnabled' | 'discountPercentage' | 'isDemo'>[] = [
  {
    id: 'rgd-w-001',
    name: 'RGD Royal Chronograph 18K',
    subtitle: 'Octagonal 18K Rose Gold Masterpiece',
    category: 'watches',
    categoryLabel: 'Luxury Watches',
    price: 4850,
    originalPrice: 5400,
    rating: 4.9,
    reviewsCount: 42,
    image: '/src/assets/images/watch_rose_gold_1794494079347.jpg',
    description: 'An icon of haute horlogerie. The RGD Royal Chronograph harmonizes an 18K brushed rose gold octagonal case with an intricate waffle-tapisserie dial and Swiss-certified chronograph movement.',
    details: [
      'Self-winding mechanical Calibre RGD-7801 with 65-hour power reserve',
      'Solid 18K rose gold case with hand-beveled satin finishing',
      'Glareproofed scratch-resistant sapphire crystal and exhibition caseback',
      'Water resistant to 100 meters (10 ATM)',
      'Handcrafted alligator leather strap with 18K folding clasp'
    ],
    composition: '18K Rose Gold, Natural Sapphire, Hand-stitched Alligator Strap',
    sizes: ['41mm', '43mm'],
    colors: [
      { name: 'Rose Gold / Noir Dial', hex: '#B76E79' },
      { name: 'Brushed Gold / Slate', hex: '#D4AF37' }
    ],
    inStock: true,
    stockCount: 6,
    isNewArrival: false,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-WT-18K-01'
  },
  {
    id: 'rgd-w-002',
    name: 'RGD Tourbillon Black Titanium',
    subtitle: 'Skeleton Calibre 01 Architecture',
    category: 'watches',
    categoryLabel: 'Luxury Watches',
    price: 8900,
    originalPrice: 9600,
    rating: 5.0,
    reviewsCount: 29,
    image: '/src/assets/images/watch_black_diamond_1794494079598.jpg',
    description: 'The pinnacle of avant-garde horology. Engineered from Grade 5 black micro-blasted titanium, the skeletonized Calibre 01 exposes the hypnotic rotation of a 60-second flying tourbillon cage with 18K gilded bridge accents.',
    details: [
      'Manufacture Flying Tourbillon with anti-magnetic silicon escapement',
      'Grade 5 Black DLC micro-blasted titanium case',
      'Double-domed anti-reflective sapphire crystal front and reverse',
      'Openwork architectural dial revealing hand-anglage bridges',
      'Integrated matte black rubberized alligator deployment strap'
    ],
    composition: 'Grade 5 Titanium, 21K Gold Oscillating Rotor, Sapphire Crystal',
    sizes: ['42mm'],
    colors: [
      { name: 'Stealth Black & Gilt', hex: '#1C1C1E' }
    ],
    inStock: true,
    stockCount: 3,
    isNewArrival: true,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-WT-SKL-02'
  },
  {
    id: 'rgd-w-003',
    name: 'RGD Heritage Perpetual Calendar',
    subtitle: 'Classic Platinum & Deep Sunburst Blue',
    category: 'watches',
    categoryLabel: 'Luxury Watches',
    price: 6400,
    originalPrice: 7100,
    rating: 4.8,
    reviewsCount: 19,
    image: '/src/assets/images/watch_perpetual_blue_1794495941635.jpg',
    description: 'A tribute to astronomical precision. The Heritage Perpetual Calendar tracks days, dates, months, leap year cycles, and astronomical moonphases with zero manual correction needed until the year 2100.',
    details: [
      'Ultra-thin perpetual calendar movement (3.88mm thickness)',
      'Sub-dials displaying day, date, month, and leap year cycle',
      'Lapis lazuli moonphase disc with 24K gold foil stars',
      'Mirror-polished platinum case with fluted winding crown'
    ],
    composition: 'Solid 950 Platinum, Fluted Bezel, Sapphire Glass',
    sizes: ['40mm'],
    colors: [
      { name: 'Sunburst Royal Blue', hex: '#1A365D' },
      { name: 'Platinum Noir', hex: '#2C2C2E' }
    ],
    inStock: true,
    stockCount: 4,
    isNewArrival: true,
    isBestSeller: false,
    isSpecialOffer: true,
    sku: 'RGD-WT-PC-03'
  },
  {
    id: 'rgd-wm-001',
    name: 'Aurelia Gilded Blazer Gown',
    subtitle: 'Structured Midnight Velvet & Gold Filigree',
    category: 'women',
    categoryLabel: "Women's Clothing",
    price: 2850,
    originalPrice: 3200,
    rating: 4.9,
    reviewsCount: 34,
    image: '/src/assets/images/women_evening_dress_1794494078742.jpg',
    description: 'An architectural statement in evening tailoring. The Aurelia combines the authority of a sculpted double-breasted tuxedo with the dramatic silhouette of a floor-length evening gown, enriched with gold bullion embroidery.',
    details: [
      'Hand-loomed Italian silk-velvet with metallic gold thread embroidery',
      'Sculpted shoulders with reinforced internal demi-corsetry',
      'Deep tuxedo lapels with satin contrast facing',
      'High front slit designed for fluid evening movement',
      'Concealed back zip and signature RGD gold-plated monogram buttons'
    ],
    composition: '82% Italian Silk Velvet, 18% Metallic Filigree Thread, 100% Silk Cupro Lining',
    sizes: ['US 2', 'US 4', 'US 6', 'US 8', 'US 10'],
    colors: [
      { name: 'Midnight Onyx & Gold', hex: '#0B0B0D' }
    ],
    inStock: true,
    stockCount: 8,
    isNewArrival: true,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-WM-BLZ-01'
  },
  {
    id: 'rgd-wm-002',
    name: 'Seraphina Parisian Cashmere Wrap Coat',
    subtitle: 'Ivory & Noir Tailored Coat with 24K Gold Buckle',
    category: 'women',
    categoryLabel: "Women's Clothing",
    price: 2450,
    originalPrice: 2800,
    rating: 4.9,
    reviewsCount: 26,
    image: '/src/assets/images/women_silk_coat_1794495941084.jpg',
    description: 'Pure Parisian boulevard chic. Woven from double-faced ivory and obsidian virgin wool-cashmere with tailored peak lapels and a signature 24K gold-plated RGD buckle belt.',
    details: [
      'Double-faced virgin wool and cashmere milled in northern Italy',
      'Contrasting black grosgrain piped lapels and storm cuffs',
      'Sculpted 24K gold-plated heraldic belt closure',
      'Hand-stitched perimeter seams and silk habotai half-lining'
    ],
    composition: '90% Virgin Wool, 10% Cashmere, 24K Gold Plated Hardware',
    sizes: ['US 2', 'US 4', 'US 6', 'US 8', 'US 10'],
    colors: [
      { name: 'Ivory & Noir', hex: '#FDFCF7' }
    ],
    inStock: true,
    stockCount: 7,
    isNewArrival: true,
    isBestSeller: false,
    isSpecialOffer: false,
    sku: 'RGD-WM-COAT-02'
  },
  {
    id: 'rgd-wm-003',
    name: 'Imperia Emerald Silk Velvet Gown',
    subtitle: 'Off-the-Shoulder Gala Gown with Grand Architectural Train',
    category: 'women',
    categoryLabel: "Women's Clothing",
    price: 3600,
    originalPrice: 4100,
    rating: 5.0,
    reviewsCount: 31,
    image: '/src/assets/images/women_emerald_gown_1794495965655.jpg',
    description: 'An operatic masterpiece created for the world’s grandest galas. Heavyweight emerald silk velvet sculpted off-the-shoulder, decorated with bullion gold acanthus embroidery descending into an ornate court train.',
    details: [
      'Pure silk velvet dyed in signature imperial emerald',
      'Over 80 hours of hand-guided gold bullion thread embroidery',
      'Internal boned corset with silk-covered hook-and-eye fastening',
      'Weighted sweeping train designed for red carpet balance'
    ],
    composition: '100% Silk Velvet, 24K Gilded Thread Embroidery, Silk Satin Lining',
    sizes: ['US 2', 'US 4', 'US 6', 'US 8'],
    colors: [
      { name: 'Imperial Emerald & Gold', hex: '#0F382A' }
    ],
    inStock: true,
    stockCount: 4,
    isNewArrival: true,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-WM-GM-03'
  },
  {
    id: 'rgd-mn-001',
    name: 'Sartorial Nocturne Tuxedo',
    subtitle: 'Bespoke Super 160s Virgin Wool & Silk Lapels',
    category: 'men',
    categoryLabel: "Men's Clothing",
    price: 3200,
    originalPrice: 3600,
    rating: 5.0,
    reviewsCount: 46,
    image: '/src/assets/images/men_collection_suit_1794494077378.jpg',
    description: 'The defining black-tie benchmark. Built with traditional full-canvas chest piece tailoring that molds effortlessly to the wearer over time. Crafted with silk faille peak lapels and pure horn buttons.',
    details: [
      'Full floating canvas construction with horsehair chest interlining',
      'Italian Super 160s virgin wool milled in Biella',
      'Silk grosgrain braided outseam on trousers with side adjusters',
      'Unfinished trouser hems for custom bespoke tailoring length'
    ],
    composition: '100% Super 160s Italian Virgin Wool, 100% Pure Silk Faille',
    sizes: ['38R', '40R', '42R', '44R', '46R'],
    colors: [
      { name: 'Midnight Onyx', hex: '#0B0B0E' }
    ],
    inStock: true,
    stockCount: 7,
    isNewArrival: false,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-MN-TXD-01'
  },
  {
    id: 'rgd-mn-002',
    name: 'Grand Sovereign Cashmere Overcoat',
    subtitle: 'Double-Faced Loro Piana Pure Cashmere',
    category: 'men',
    categoryLabel: "Men's Clothing",
    price: 3850,
    originalPrice: 4200,
    rating: 4.9,
    reviewsCount: 28,
    image: '/src/assets/images/men_black_overcoat_1794495965409.jpg',
    description: 'Uncompromising luxury and warmth. Made from double-faced pure Mongolian cashmere, hand-split and finished along every edge with seamless invisible stitching, accented with a 24K gold lapel crest.',
    details: [
      '100% double-faced Grade A Mongolian Cashmere',
      'Hand-sewn double-face construction (requires 36 hours of handwork)',
      'Subtle metallic gold chain collar hanger in pure brass',
      'Horn button front closure with storm throat latch'
    ],
    composition: '100% Pure Cashmere, Genuine Buffalo Horn Buttons',
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Caviar Black', hex: '#111114' }
    ],
    inStock: true,
    stockCount: 4,
    isNewArrival: true,
    isBestSeller: true,
    isSpecialOffer: false,
    sku: 'RGD-MN-COAT-02'
  },
  {
    id: 'rgd-mn-003',
    name: 'Milano Double-Breasted Cashmere Blazer',
    subtitle: 'Gold-Accented Sovereign Navy Formal Statement',
    category: 'men',
    categoryLabel: "Men's Clothing",
    price: 2150,
    originalPrice: 2500,
    rating: 4.8,
    reviewsCount: 15,
    image: '/src/assets/images/men_navy_blazer_1794495940721.jpg',
    description: 'A contemporary modern cut with broad peaked lapels, soft Neapolitan shoulders, and six custom 24K gold-plated RGD heraldic crest buttons.',
    details: [
      'Wool and cashmere blend for superior drape and natural warmth',
      'Half-lined in bespoke jacquard silk for lightweight breathability',
      'Working surgeon cuffs with custom gold emblem buttons',
      'Dual rear vents for effortless posture and mobility'
    ],
    composition: '80% Virgin Wool, 20% Cashmere, 24K Gold-Plated Metal Buttons',
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Midnight Sovereign Navy', hex: '#0E1726' }
    ],
    inStock: true,
    stockCount: 9,
    isNewArrival: true,
    isBestSeller: false,
    isSpecialOffer: true,
    sku: 'RGD-MN-BLZ-03'
  }
];

export const INITIAL_PRODUCTS: Product[] = RAW_SEED_PRODUCTS.map((p) => {
  const hasDiscount = typeof p.originalPrice === 'number' && p.originalPrice > p.price;
  return {
    ...p,
    images: [p.image],
    originalPrice: p.originalPrice ?? p.price,
    discountEnabled: hasDiscount,
    discountPercentage: hasDiscount ? calculatePercentFromPrices(p.originalPrice!, p.price) : 0,
    isDemo: true,
  };
});

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_10482',
    orderNumber: 'RGD-2026-10482',
    createdAt: '2026-11-10T14:22:00Z',
    customer: {
      name: 'Demo Client — Julian Vance',
      email: 'demo.client1@example.invalid',
      phone: '+1 212 555 0192',
      address: '740 Park Avenue, Suite 14B',
      city: 'New York',
      postalCode: '10021',
      country: 'United States'
    },
    items: [
      {
        productId: 'rgd-w-001',
        name: 'RGD Royal Chronograph 18K',
        price: 4850,
        originalPrice: 5400,
        quantity: 1,
        selectedSize: '41mm',
        selectedColor: 'Rose Gold / Noir Dial',
        image: '/src/assets/images/watch_rose_gold_1794494079347.jpg'
      }
    ],
    subtotal: 4850,
    shippingFee: 0,
    tax: 364,
    discount: 0,
    total: 5214,
    paymentMethod: 'card_demo',
    paymentStatus: 'demo_unpaid',
    orderStatus: 'Confirmed',
    trackingNumber: 'RGD-EXP-88392019',
    notes: 'Demonstration sample order — white-glove courier preview.'
  },
  {
    id: 'ord_10483',
    orderNumber: 'RGD-2026-10483',
    createdAt: '2026-11-11T18:45:00Z',
    customer: {
      name: 'Demo Client — Elena Rostova',
      email: 'demo.client2@example.invalid',
      phone: '+41 22 555 4912',
      address: 'Rue du Rhône 42',
      city: 'Geneva',
      postalCode: '1204',
      country: 'Switzerland'
    },
    items: [
      {
        productId: 'rgd-wm-001',
        name: 'Aurelia Gilded Blazer Gown',
        price: 2850,
        originalPrice: 3200,
        quantity: 1,
        selectedSize: 'US 4',
        selectedColor: 'Midnight Onyx & Gold',
        image: '/src/assets/images/women_evening_dress_1794494078742.jpg'
      }
    ],
    subtotal: 2850,
    shippingFee: 0,
    tax: 214,
    discount: 285,
    total: 2779,
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderStatus: 'Dispatched',
    trackingNumber: 'RGD-SWISS-7749102',
    notes: 'Demonstration sample order — Cash on Delivery upon verified delivery.'
  }
];
