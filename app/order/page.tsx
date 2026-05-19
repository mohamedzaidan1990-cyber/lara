import { Suspense } from "react";
import OrderFlow from "./OrderFlow";

export const dynamic = "force-dynamic";

export default function OrderPage() {
  const whish = process.env.WHISH_NUMBER ?? "";

  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/60">Loading…</div>}>
      <OrderFlow whish={whish} />
    </Suspense>
  );
}
