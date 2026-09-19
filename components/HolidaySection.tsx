import HolidayPoster from "@/components/HolidayPoster";
import ProductCard, { type ProductCardData } from "@/components/ProductCard";
import { HOLIDAY_SECTION_ID } from "@/lib/holiday-collection";
import { whatsappRequestLink } from "@/lib/links";

// Homepage "Holidays Special" block: the poster as the section header, then
// the gifts and sets. With no products yet it shows a teaser instead of an
// empty grid.
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
          hasProducts ? undefined : (
            <a
              href={whatsappRequestLink()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#e9c46a] px-7 py-3.5 text-sm font-bold text-ink shadow-lg transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
            >
              Message us for gift ideas
            </a>
          )
        }
      />

      {hasProducts ? (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard key={product.id ?? `${product.brand}-${product.name}`} index={i} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
