export interface FeaturedProduct {
  brand: string;
  name: string;
  category: "Women" | "Men" | "Beauty" | "Bags" | "Shoes";
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

const rate = Number(process.env.GBP_TO_USD_RATE ?? 1.27);

function usd(gbp: number): number {
  return Math.round(gbp * 1.1 * rate * 100) / 100;
}

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    brand: "Bottega Veneta",
    name: "Small Andiamo Intrecciato Leather Bag",
    category: "Bags",
    price_gbp: 3450,
    price_usd: usd(3450),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/bottega-veneta/",
    image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"
  },
  {
    brand: "Saint Laurent",
    name: "Le 5 à 7 Soft Hobo Bag",
    category: "Bags",
    price_gbp: 2150,
    price_usd: usd(2150),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/saint-laurent/",
    image_url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80"
  },
  {
    brand: "Loewe",
    name: "Puzzle Small Leather Cross-body Bag",
    category: "Bags",
    price_gbp: 2750,
    price_usd: usd(2750),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/loewe/",
    image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
  },
  {
    brand: "Christian Louboutin",
    name: "So Kate 120 Patent Leather Pumps",
    category: "Shoes",
    price_gbp: 745,
    price_usd: usd(745),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/christian-louboutin/",
    image_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"
  },
  {
    brand: "Manolo Blahnik",
    name: "Hangisi 105 Crystal-Buckle Satin Pumps",
    category: "Shoes",
    price_gbp: 985,
    price_usd: usd(985),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/manolo-blahnik/",
    image_url: "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=800&q=80"
  },
  {
    brand: "Prada",
    name: "Re-Nylon Brushed Leather Loafers",
    category: "Shoes",
    price_gbp: 1200,
    price_usd: usd(1200),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/prada/",
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
  },
  {
    brand: "La Mer",
    name: "Crème de la Mer Moisturising Cream 60ml",
    category: "Beauty",
    price_gbp: 320,
    price_usd: usd(320),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/la-mer/",
    image_url: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80"
  },
  {
    brand: "Tom Ford",
    name: "Oud Wood Eau de Parfum 50ml",
    category: "Beauty",
    price_gbp: 235,
    price_usd: usd(235),
    deliverable_lebanon: false,
    product_url: "https://www.selfridges.com/GB/en/cat/tom-ford/",
    image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80"
  },
  {
    brand: "Dior",
    name: "Lady Dior Lambskin Mini Bag",
    category: "Women",
    price_gbp: 4400,
    price_usd: usd(4400),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/dior/",
    image_url: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80"
  },
  {
    brand: "Chanel",
    name: "Tweed Cropped Jacket",
    category: "Women",
    price_gbp: 5200,
    price_usd: usd(5200),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/chanel/",
    image_url: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80"
  },
  {
    brand: "Tom Ford",
    name: "Slim-fit Wool Two-Piece Suit",
    category: "Men",
    price_gbp: 3800,
    price_usd: usd(3800),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/tom-ford/menswear/",
    image_url: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80"
  },
  {
    brand: "Brunello Cucinelli",
    name: "Cashmere Crewneck Sweater",
    category: "Men",
    price_gbp: 1450,
    price_usd: usd(1450),
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/brunello-cucinelli/",
    image_url: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80"
  }
];

export const FALLBACK_PRODUCTS: FeaturedProduct[] = FEATURED_PRODUCTS.slice(0, 8);

export const CATEGORIES = ["All", "Women", "Men", "Beauty", "Bags", "Shoes"] as const;
export type Category = (typeof CATEGORIES)[number];
