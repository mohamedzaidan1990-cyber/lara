import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";
import { getBrandsForDirectory } from "@/lib/brands";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categoryStats, brands] = await Promise.all([
    getCategoryStats(),
    getBrandsForDirectory(),
  ]);
  return <HomeClient categories={categoryStats} brands={brands} />;
}
