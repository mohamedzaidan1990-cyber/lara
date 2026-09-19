import ProductCard, { type ProductCardData } from "@/components/ProductCard";

// The gift-set product grid, shared by the homepage preview and /holiday.
export default function HolidayGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard key={product.id ?? `${product.brand}-${product.name}`} index={i} product={product} />
      ))}
    </div>
  );
}
