import HomeClient from "./HomeClient";
import { getCategoryStats } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categoryStats = await getCategoryStats();
  return <HomeClient categories={categoryStats} />;
}
