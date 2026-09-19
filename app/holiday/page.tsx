import Link from "next/link";
import type { Metadata } from "next";
import HolidayGrid from "@/components/HolidayGrid";
import HolidayPoster, { HOLIDAY_CTA_CLASS } from "@/components/HolidayPoster";
import { getProductsByIds } from "@/lib/products";
import { toProductCardData } from "@/lib/product-card-data";
import { whatsappRequestLink } from "@/lib/links";
import { HOLIDAY_PATH, HOLIDAY_PRODUCT_IDS, HOLIDAY_SUBTITLE, HOLIDAY_TITLE } from "@/lib/holiday-collection";

export const dynamic = "force-dynamic";

const PAGE_URL = `https://www.seasonsbyb.co.uk${HOLIDAY_PATH}`;
const DESCRIPTION = `${HOLIDAY_SUBTITLE} Delivered to Lebanon in 10–14 working days.`;

export const metadata: Metadata = {
  title: `${HOLIDAY_TITLE} — Gift Sets`,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: `${HOLIDAY_TITLE} — Seasons by B`, description: DESCRIPTION, url: PAGE_URL, siteName: "Seasons by B", type: "website" }
};

export default async function HolidayPage() {
  const products = (await getProductsByIds(HOLIDAY_PRODUCT_IDS)).map(toProductCardData);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-ink/60">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="mx-2 text-ink/30">/</span>
        <span className="text-ink">{HOLIDAY_TITLE}</span>
      </nav>

      <div className="mt-6">
        <HolidayPoster
          variant="banner"
          headingAs="h1"
          note={products.length > 0 ? "Delivered to Lebanon in 10–14 working days." : "The gifts are being wrapped. Check back soon."}
          cta={
            products.length > 0 ? undefined : (
              <a href={whatsappRequestLink()} target="_blank" rel="noreferrer" className={HOLIDAY_CTA_CLASS}>
                Message us for gift ideas
              </a>
            )
          }
        />
      </div>

      {products.length > 0 ? (
        <>
          <p className="mt-10 text-sm text-ink/60">
            {products.length} gift {products.length === 1 ? "set" : "sets"}
          </p>
          <div className="mt-4">
            <HolidayGrid products={products} />
          </div>
        </>
      ) : null}
    </div>
  );
}
