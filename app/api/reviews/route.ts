import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { submitReview } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  orderItemId?: string;
  rating?: number;
  reviewText?: string | null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const orderItemId = typeof body.orderItemId === "string" ? body.orderItemId : "";
  const rating = Number(body.rating);
  const reviewText = typeof body.reviewText === "string" && body.reviewText.trim() ? body.reviewText.trim() : null;

  if (!orderItemId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
  }

  await ensureSchema();
  const result = await submitReview({ orderItemId, rating, reviewText });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
