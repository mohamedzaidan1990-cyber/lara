import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { setReviewHidden } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  hidden?: boolean;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "Missing hidden field" }, { status: 400 });
  }
  await ensureSchema();
  const review = await setReviewHidden(params.id, body.hidden);
  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ review });
}
