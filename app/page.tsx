import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";
import { getBrandsForDirectory } from "@/lib/brands";
import { getPublicOrderCount } from "@/lib/order-stats";
import { getTopBrands } from "@/lib/top-brands";
import { getProductsByIds } from "@/lib/products";
import { HOME_PROMOS } from "@/lib/home-promos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoryStats, brands, topBrands, orderCount, promoProducts] = await Promise.all([
    getCategoryStats(),
    getBrandsForDirectory(),
    getTopBrands(12),
    getPublicOrderCount(),
    getProductsByIds(HOME_PROMOS.flatMap((p) => p.productIds)),
  ]);

  const byId = new Map(promoProducts.map((p) => [p.id, p]));
  const homePromos = HOME_PROMOS.map((promo) => ({
    title: promo.title,
    products: promo.productIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
  })).filter((promo) => promo.products.length > 0);

  return (
    <HomeClient
      categories={categoryStats}
      brands={brands}
      topBrands={topBrands}
      orderCount={orderCount}
      homePromos={homePromos}
    />
  );
}
