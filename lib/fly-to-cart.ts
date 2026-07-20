// Flies a ghost of the product image from the card into the header cart icon.
// Returns true when the animation actually runs (so callers can delay opening
// the cart sidebar until the ghost lands), false when it is skipped — no
// source image, reduced-motion preference, or no visible cart button.
export function flyToCart(sourceEl: Element | null): boolean {
  if (typeof window === "undefined" || !sourceEl) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  // Two CartButtons exist (desktop nav + mobile bar); use the visible one.
  let target: HTMLElement | null = null;
  document.querySelectorAll<HTMLElement>("[data-cart-target]").forEach((t) => {
    if (t.offsetParent !== null) target = t;
  });
  if (!target) return false;

  const img = sourceEl.querySelector("img");
  if (!img) return false;

  const from = img.getBoundingClientRect();
  const to = (target as HTMLElement).getBoundingClientRect();
  if (from.width === 0 || to.width === 0) return false;

  const ghost = document.createElement("img");
  ghost.src = img.currentSrc || img.src;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText =
    `position:fixed;left:${from.left}px;top:${from.top}px;` +
    `width:${from.width}px;height:${from.height}px;object-fit:cover;` +
    "border-radius:1rem;z-index:100;pointer-events:none;will-change:transform,opacity;";
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = Math.max(to.width / from.width, 0.08);

  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.4}px,${dy * 0.55}px) scale(${(1 + scale) / 2})`, opacity: 0.9 },
      { transform: `translate(${dx}px,${dy}px) scale(${scale})`, opacity: 0.25 }
    ],
    { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  );
  anim.onfinish = () => ghost.remove();
  // Safety net in case onfinish never fires.
  setTimeout(() => ghost.remove(), 1200);
  return true;
}
