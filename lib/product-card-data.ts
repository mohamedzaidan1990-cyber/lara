import type { RelatedProduct } from "@/lib/products";
import type { ProductCardData } from "@/components/ProductCard";

// Maps a catalogue row to the shape ProductCard renders.
export function toProductCardData(p: RelatedProduct): ProductCardData {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    price_gbp: p.price_gbp,
    price_usd: p.price_usd,
    deliverable_lebanon: p.deliverable_lebanon,
    product_url: p.product_url ?? "",
    image_url: p.image_url ?? "",
    category: p.category,
    subcategory: p.subcategory,
    light_shade_image_url: p.light_shade_image_url,
    is_bestseller: p.is_bestseller,
    created_at: p.created_at
  };
}
