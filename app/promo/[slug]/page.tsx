import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getProductsByIds } from "@/lib/products";
import { HOME_PROMOS, getHomePromoBySlug } from "@/lib/home-promos";

interface Params {
  slug: string;
}

export const dynamic = "force-dynamic";

export function generateStaticParams(): Array<{ slug: string }> {
  return HOME_PROMOS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const promo = getHomePromoBySlug(params.slug);
  if (!promo) return { title: "Promotion not found — Seasons by B" };
  const title = `${promo.title} — Seasons by B`;
  const description = promo.note ?? `${promo.title} — a limited-time edit from Seasons by B, curated in London.`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.seasonsbyb.co.uk/promo/${promo.slug}` },
    openGraph: { title, description, url: `https://www.seasonsbyb.co.uk/promo/${promo.slug}`, siteName: "Seasons by B", type: "website" }
  };
}

export default async function PromoPage({ params }: { params: Params }) {
  const promo = getHomePromoBySlug(params.slug);
  if (!promo) notFound();

  const allProducts = await getProductsByIds(promo.productIds);
  const byId = new Map(allProducts.map((p) => [p.id, p]));
  const products = promo.productIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{promo.title}</span>
      </nav>

      <header className="mt-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-accent via-accent-500 to-secondary p-8 text-white shadow-soft sm:p-12">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.32em] text-white/80">On offer now</p>
          <h1 className="relative mt-2 font-serif text-4xl font-bold sm:text-5xl">{promo.title}</h1>
          {promo.note ? <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-white/85">{promo.note}</p> : null}
          <p className="relative mt-3 text-sm text-white/85">
            {products.length} {products.length === 1 ? "item" : "items"} in this edit.
          </p>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 rounded-[2rem] border border-white/60 bg-white/50 p-12 text-center shadow-soft">
          <p className="text-sm text-ink/60">This promotion is no longer available.</p>
          <Link href="/" className="btn-gold">
            Back to shopping
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard
              key={p.id}
              index={i}
              product={{
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
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
