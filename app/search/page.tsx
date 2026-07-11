import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export const dynamic = "force-dynamic";

export default function SearchPage({
  searchParams
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  return (
    <Suspense>
      <SearchPageClient initialQuery={q} />
    </Suspense>
  );
}
