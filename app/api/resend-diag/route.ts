// TEMPORARY diagnostic endpoint — remove after confirming Resend.
// Token-guarded. Sends the test email using RESEND_API_KEY from the
// environment and returns Resend's raw { data, error }.
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = "snb-diag-send-7741";

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("t") !== TOKEN) {
    return new Response("Not found", { status: 404 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_placeholder_replace_before_deploy") {
    return NextResponse.json({ keyStatus: "placeholder_or_unset" });
  }

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: "Seasons by B <hello@seasonsbyb.co.uk>",
    to: "mohamedzaidan1990@gmail.com",
    subject: "Seasons by B — Email Test ✅",
    html: "This is a test email confirming your Resend integration is working correctly. Emails from Seasons by B are now live.",
    text: "This is a test email confirming your Resend integration is working correctly. Emails from Seasons by B are now live."
  });

  return NextResponse.json({ keyStatus: "present", data, error });
}
