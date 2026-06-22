import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  let host = "(not set)";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "(invalid URL)";
  }
  return NextResponse.json({ host });
}
