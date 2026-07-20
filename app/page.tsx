import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";
import { getBrandsForDirectory } from "@/lib/brands";
import { getPublicOrderCount } from "@/lib/order-stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoryStats, brands, orderCount] = await Promise.all([
    getCategoryStats(),
    getBrandsForDirectory(),
    getPublicOrderCount(),
  ]);
  return <HomeClient categories={categoryStats} brands={brands} orderCount={orderCount} />;
}
