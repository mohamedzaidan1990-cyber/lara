import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getProductById, getRelatedProducts } from "@/lib/products";
import { getSql } from "@/lib/db";
import { categorySlug } from "@/lib/categories";
import ProductDetailClient from "./ProductDetailClient";

const SUMMER_SET_URL = "https://hudabeauty.com/en-qa/products/summers-hottest-look-set_136";
const EDP_URL = "https://hudabeauty.com/en-qa/products/easy-bake-intense-eau-de-parfum-travel-spray-10ml-hb01781";

interface Params {
  id: string;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProductById(params.id);
  if (!product) return { title: "Product not found — Seasons by B" };
  return {
    title: `${product.brand} ${product.name} — Seasons by B`,
    description: `${product.brand} ${product.name} — sourced from London and delivered to Lebanon by Seasons by B.`
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.category, product.id, 4);
  const slug = categorySlug(product.category);

  // If this is the Summer's Hottest Look Set, fetch the EDP gift product to auto-add it to cart.
  let promoGift: { id: string; brand: string; name: string; price_usd: number; price_gbp: number; image_url: string | null; product_url: string | null; category: string } | null = null;
  if (product.product_url === SUMMER_SET_URL) {
    try {
      const sql = getSql();
      const rows = await sql`
        select id, brand, name, price_gbp::float as price_gbp, price_usd::float as price_usd,
               product_url, image_url, category
        from products where product_url = ${EDP_URL} limit 1
      ` as Array<{ id: string; brand: string; name: string; price_gbp: number; price_usd: number; product_url: string | null; image_url: string | null; category: string }>;
      promoGift = rows[0] ?? null;
    } catch { /* non-fatal */ }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        {slug ? (
          <Link href={`/category/${slug}`} className="hover:text-accent">
            {product.category}
          </Link>
        ) : (
          <span>{product.category}</span>
        )}
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{product.brand}</span>
      </nav>

      <div className="mt-8">
        <ProductDetailClient product={product} promoGift={promoGift} />
      </div>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-ink/10 pt-10">
          <h2 className="font-serif text-2xl text-ink">You might also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p, i) => (
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
                  category: p.category
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
