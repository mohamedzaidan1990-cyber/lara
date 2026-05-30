// TEMPORARY diagnostic endpoint — remove after verifying Resend.
// Token-guarded. Sends a test email and returns Resend's raw { data, error }.
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "snb-diag-9271";

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("t") !== TOKEN) {
    return new Response("Not found", { status: 404 });
  }
  const key = process.env.RESEND_API_KEY;
  const masked = key ? `${key.slice(0, 5)}…len${key.length}` : "(unset)";
  if (!key || key === "re_placeholder_replace_before_deploy") {
    return NextResponse.json({ keyStatus: "placeholder_or_unset", masked });
  }

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: "Seasons by B <hello@seasonsbyb.co.uk>",
    to: "mohamedzaidan1990@gmail.com",
    subject: "Seasons by B — Email Test",
    html: "<p>This is a test email confirming your Resend integration is working correctly.</p>",
    text: "This is a test email confirming your Resend integration is working correctly."
  });

  return NextResponse.json({ keyStatus: "present", masked, data, error });
}
