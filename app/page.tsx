import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";
import { getBrandsForDirectory } from "@/lib/brands";
import { getPublicOrderCount } from "@/lib/order-stats";
import { getTopBrands } from "@/lib/top-brands";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoryStats, brands, topBrands, orderCount] = await Promise.all([
    getCategoryStats(),
    getBrandsForDirectory(),
    getTopBrands(6),
    getPublicOrderCount(),
  ]);
  return (
    <HomeClient
      categories={categoryStats}
      brands={brands}
      topBrands={topBrands}
      orderCount={orderCount}
    />
  );
}
