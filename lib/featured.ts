import { convertGbpToUsd } from "./currency";

export type Category =
  | "All"
  | "Makeup"
  | "Skincare"
  | "Fragrance"
  | "Bags"
  | "Haircare"
  | "Accessories"
  | "Beauty tools";

export type ProductCategory = Exclude<Category, "All">;

export interface FeaturedProductData {
  brand: string;
  name: string;
  category: ProductCategory;
  price_gbp: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
}

export interface FeaturedProduct extends FeaturedProductData {
  price_usd: number;
}

// Compact fallback used when the in-app scraper returns nothing AND the
// `products` table has nothing matching the user's search. With the Railway
// scraper worker + seed script populating 300 rows, this should rarely run.
const FALLBACK_DATA: FeaturedProductData[] = [
  {
    brand: "Charlotte Tilbury",
    name: "Pillow Talk Lipstick",
    category: "Makeup",
    price_gbp: 30,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/charlotte-tilbury/#fallback-pillow-talk-lipstick",
    image_url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80"
  },
  {
    brand: "La Mer",
    name: "Crème de la Mer Moisturising Cream 60ml",
    category: "Skincare",
    price_gbp: 325,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/la-mer/#fallback-creme-de-la-mer-60ml",
    image_url: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80"
  },
  {
    brand: "Olaplex",
    name: "No.3 Hair Perfector 100ml",
    category: "Haircare",
    price_gbp: 28,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/olaplex/#fallback-no-3-hair-perfector",
    image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80"
  },
  {
    brand: "Dyson",
    name: "Airwrap Multi-Styler Complete Long",
    category: "Beauty tools",
    price_gbp: 479.99,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/dyson/#fallback-airwrap-complete-long",
    image_url: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80"
  },
  {
    brand: "Sisley",
    name: "Black Rose Cream Mask 60ml",
    category: "Skincare",
    price_gbp: 100,
    deliverable_lebanon: true,
    product_url: "https://www.selfridges.com/GB/en/cat/sisley/#fallback-black-rose-cream-mask",
    image_url: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80"
  },
  {
    brand: "Sunday Riley",
    name: "Good Genes All-In-One Lactic Acid Treatment",
    category: "Skincare",
    price_gbp: 85,
    deliverable_lebanon: true,
    product_url: "https://www.spacenk.com/uk/skincare/treatment/serums/good-genes-all-in-one-lactic-acid-treatment",
    image_url: ""
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

export async function getFallbackProducts(): Promise<FeaturedProduct[]> {
  return withPrices(FALLBACK_DATA);
}

export const CATEGORIES: readonly Category[] = ["All", "Makeup", "Skincare", "Fragrance", "Haircare", "Beauty tools"] as const;

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  "Makeup",
  "Skincare",
  "Fragrance",
  "Haircare",
  "Beauty tools"
] as const;
