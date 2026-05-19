import HomeClient from "./HomeClient";
import { getFeaturedProducts } from "@/lib/featured";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getFeaturedProducts();
  return <HomeClient initialFeatured={featured} />;
}
