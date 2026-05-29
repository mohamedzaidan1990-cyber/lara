// Shared WhatsApp contact helpers so the number + prefilled bespoke message
// stay consistent across the site.

export const WHATSAPP_NUMBER = "96103055491";

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Builds a wa.me link with a prefilled message. Defaults to the bespoke
// sourcing prompt the brief specifies.
export function whatsappRequestLink(prefill = "Hi Seasons by B, I'm looking for: "): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(prefill)}`;
}
