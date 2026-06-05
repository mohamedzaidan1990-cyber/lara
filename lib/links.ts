// Shared contact links. The Instagram handle comes from
// NEXT_PUBLIC_INSTAGRAM_USERNAME (inlined at build time) and defaults to the
// real handle, so it works without any env var; set the env var in Vercel to
// change it later without a code change.

export const INSTAGRAM_USERNAME = (process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "seasons.by.b").replace(/^@/, "");
export const INSTAGRAM_HANDLE = `@${INSTAGRAM_USERNAME}`;
// Public profile.
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_USERNAME}`;
// ig.me/m/<handle> opens a direct-message thread (the Instagram equivalent of
// wa.me). Used for "message us" actions.
export const INSTAGRAM_DM_URL = `https://ig.me/m/${INSTAGRAM_USERNAME}`;

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@seasonsbyb.co.uk";
export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`;

// Back-compat aliases: existing imports keep working but now open Instagram.
// (Internal names only — not shown to customers.)
export const WHATSAPP_URL = INSTAGRAM_DM_URL;
export function whatsappRequestLink(_prefill?: string): string {
  // Instagram can't pre-fill a message; this just opens a DM thread.
  return INSTAGRAM_DM_URL;
}
