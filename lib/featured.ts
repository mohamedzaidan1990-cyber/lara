import { convertGbpToUsd } from "./currency";

export type Category = "All" | "Beauty" | "Skincare" | "Makeup" | "Haircare" | "Bags" | "Accessories";

export interface FeaturedProductData {
  brand: string;
  name: string;
  category: Exclude<Category, "All">;
  price_gbp: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

export interface FeaturedProduct extends FeaturedProductData {
  price_usd: number;
}

export const FEATURED_PRODUCT_DATA: FeaturedProductData[] = [
  {
    brand: "Charlotte Tilbury",
    name: "Pillow Talk Lip & Cheek Glow Kit",
    category: "Beauty",
    price_gbp: 65,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/charlotte-tilbury/",
    image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80"
  },
  {
    brand: "La Mer",
    name: "Crème de la Mer Moisturising Cream 60ml",
    category: "Skincare",
    price_gbp: 195,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/la-mer/",
    image_url: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80"
  },
  {
    brand: "NARS",
    name: "Soft Matte Complete Concealer",
    category: "Makeup",
    price_gbp: 28,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/nars/",
    image_url: "https://images.unsplash.com/photo-1599733589046-8e1f10f57cca?w=800&q=80"
  },
  {
    brand: "Dior",
    name: "Backstage Face & Body Foundation",
    category: "Makeup",
    price_gbp: 42,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/dior/",
    image_url: "https://images.unsplash.com/photo-1631214524020-3c8b9a541b06?w=800&q=80"
  },
  {
    brand: "Sisley",
    name: "Black Rose Skin Infusion Cream",
    category: "Skincare",
    price_gbp: 185,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/sisley/",
    image_url: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80"
  },
  {
    brand: "Charlotte Tilbury",
    name: "Magic Cream Moisturiser 50ml",
    category: "Skincare",
    price_gbp: 95,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/charlotte-tilbury/",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80"
  },
  {
    brand: "YSL",
    name: "Touche Éclat Illuminating Pen",
    category: "Makeup",
    price_gbp: 34,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/ysl/",
    image_url: "https://images.unsplash.com/photo-1522335789203-aaa2eb0aaccc?w=800&q=80"
  },
  {
    brand: "Gucci",
    name: "GG Marmont Small Shoulder Bag",
    category: "Bags",
    price_gbp: 1180,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/gucci/",
    image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"
  },
  {
    brand: "Valentino",
    name: "Rockstud Calfskin Tote",
    category: "Bags",
    price_gbp: 1450,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/valentino/",
    image_url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80"
  },
  {
    brand: "Loewe",
    name: "Puzzle Small Leather Bag",
    category: "Bags",
    price_gbp: 1650,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/loewe/",
    image_url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
  },
  {
    brand: "Bottega Veneta",
    name: "Intrecciato Leather Mini Pouch",
    category: "Bags",
    price_gbp: 890,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/bottega-veneta/",
    image_url: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80"
  },
  {
    brand: "Mulberry",
    name: "Alexa Satchel",
    category: "Bags",
    price_gbp: 795,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/mulberry/",
    image_url: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80"
  }
];

async function withPrices(items: FeaturedProductData[]): Promise<FeaturedProduct[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      price_usd: await convertGbpToUsd(item.price_gbp)
    }))
  );
}

export async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  return withPrices(FEATURED_PRODUCT_DATA);
}

export async function getFallbackProducts(): Promise<FeaturedProduct[]> {
  return withPrices(FEATURED_PRODUCT_DATA.slice(0, 8));
}

export const CATEGORIES = [
  "All",
  "Beauty",
  "Skincare",
  "Makeup",
  "Haircare",
  "Bags",
  "Accessories"
] as const;
