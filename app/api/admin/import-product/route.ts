import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { importMany } from "@/lib/selfridges-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_URLS = 20;

interface Body {
  urls?: unknown;
}

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const raw = Array.isArray(body.urls) ? body.urls : [];

  const urls = raw
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, MAX_URLS);

  if (urls.length === 0) {
    return NextResponse.json({ error: "No valid URLs provided" }, { status: 400 });
  }

  const products = await importMany(urls);
  return NextResponse.json({ products });
}
