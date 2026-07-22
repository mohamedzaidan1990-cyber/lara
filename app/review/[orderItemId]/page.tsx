import { notFound } from "next/navigation";
import { getOrderItemForReview } from "@/lib/reviews";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

interface Params {
  orderItemId: string;
}

export default async function ReviewPage({ params }: { params: Params }) {
  const item = await getOrderItemForReview(params.orderItemId);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Your review</p>
      <h1 className="mt-3 font-serif text-3xl text-ink">
        {item.product_brand} {item.product_name}
      </h1>
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={`${item.product_brand} ${item.product_name}`}
          className="mt-6 h-48 w-48 object-cover"
        />
      ) : null}
      {item.already_reviewed ? (
        <p className="mt-8 text-sm text-ink/70">You&apos;ve already reviewed this item — thank you!</p>
      ) : !item.product_url ? (
        <p className="mt-8 text-sm text-ink/70">
          Reviews aren&apos;t available for this item right now — thanks for understanding!
        </p>
      ) : (
        <ReviewForm orderItemId={item.id} />
      )}
    </div>
  );
}
