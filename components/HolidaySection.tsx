import Link from "next/link";
import HolidayGrid from "@/components/HolidayGrid";
import HolidayPoster, { HOLIDAY_CTA_CLASS } from "@/components/HolidayPoster";
import type { ProductCardData } from "@/components/ProductCard";
import { HOLIDAY_PATH, HOLIDAY_SECTION_ID } from "@/lib/holiday-collection";
import { whatsappRequestLink } from "@/lib/links";

// How many sets the homepage previews before sending people to /holiday.
const PREVIEW_COUNT = 4;

// Homepage "Holidays Special" block: the poster, a short preview of the gift
// sets and a link to the full /holiday page. With no products yet it shows a
// teaser instead.
export default function HolidaySection({ products }: { products: ProductCardData[] }) {
  const hasProducts = products.length > 0;

  return (
    <section
      id={HOLIDAY_SECTION_ID}
      aria-labelledby="holiday-heading"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pt-10 sm:px-6 lg:px-8"
    >
      <HolidayPoster
        variant="banner"
        headingId="holiday-heading"
        note={hasProducts ? "Delivered to Lebanon in 10–14 working days." : "The gifts are being wrapped. Check back soon."}
        cta={
          hasProducts ? (
            <Link href={HOLIDAY_PATH} className={HOLIDAY_CTA_CLASS}>
              Shop the Holiday Edit
            </Link>
          ) : (
            <a href={whatsappRequestLink()} target="_blank" rel="noreferrer" className={HOLIDAY_CTA_CLASS}>
              Message us for gift ideas
            </a>
          )
        }
      />

      {hasProducts ? (
        <>
          <div className="mt-10">
            <HolidayGrid products={products.slice(0, PREVIEW_COUNT)} />
          </div>
          <div className="mt-8 text-center">
            <Link href={HOLIDAY_PATH} className="btn-outline">
              View all {products.length} gift sets
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
