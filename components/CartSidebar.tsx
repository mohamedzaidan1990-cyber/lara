"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart, computeTotals } from "@/lib/cart";
import { productImageSrc } from "@/lib/images";
import { BeeMascot } from "./BeeMascot";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function CartSidebar() {
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);

  const { totalItems, totalUSD } = computeTotals(items);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            aria-hidden
          />
          <motion.aside
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-cream shadow-soft"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Shopping cart"
          >
            <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <h2 className="font-serif text-2xl text-ink">
                Your Cart {totalItems > 0 ? <span className="text-ink/40">({totalItems})</span> : null} 🐝
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="text-ink/50 transition-colors hover:text-accent"
              >
                ✕
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
                <BeeMascot variant="floating" />
                <p className="text-sm text-ink/60">Your cart is empty</p>
                <button type="button" onClick={closeCart} className="btn-gold">
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="space-y-4">
                    {items.map((item) => {
                      const src = productImageSrc(item.image_url);
                      return (
                        <li key={item.id} className="flex gap-3 border-b border-ink/10 pb-4">
                          <div className="h-[60px] w-[60px] flex-shrink-0 overflow-hidden bg-ink/[0.04]">
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={src} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-serif text-xl" style={{ color: "#F4D360" }}>
                                {(item.brand || "?").charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/55">{item.brand}</p>
                            <p className="line-clamp-2 text-sm text-ink">{item.name}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="flex h-6 w-6 items-center justify-center border border-ink/20 text-ink hover:border-accent"
                                >
                                  −
                                </button>
                                <span className="min-w-5 text-center text-sm text-ink">{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="flex h-6 w-6 items-center justify-center border border-ink/20 text-ink hover:border-accent"
                                >
                                  +
                                </button>
                              </div>
                              <span className="font-serif text-sm text-ink">{formatUsd(item.price_usd * item.quantity)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="mt-2 self-start text-[10px] uppercase tracking-[0.18em] text-ink/40 hover:text-accent"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <footer className="border-t border-ink/10 px-5 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm uppercase tracking-[0.18em] text-ink/60">Subtotal</span>
                    <span className="font-serif text-2xl text-ink">{formatUsd(totalUSD)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/45">Final price confirmed at checkout.</p>
                  <Link href="/checkout" onClick={closeCart} className="btn-primary mt-4 w-full justify-center">
                    Proceed to Checkout
                  </Link>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="mt-3 w-full text-center text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent"
                  >
                    Continue Shopping
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
