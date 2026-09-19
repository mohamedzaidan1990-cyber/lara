"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HolidayPoster, { HOLIDAY_CTA_CLASS } from "@/components/HolidayPoster";
import { HOLIDAY_PATH, HOLIDAY_TITLE } from "@/lib/holiday-collection";

const SHOW_FOR_MS = 7000;
// Let the page fade in first so the popup doesn't fight it.
const OPEN_DELAY_MS = 900;
// Once per browser session — otherwise every trip back to the homepage re-opens it.
const SEEN_KEY = "sbb-holiday-popup-seen";

export default function HolidayPopup() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Storage blocked (private mode etc.) — just show it.
    }
    if (seen) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="holiday-popup"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/60 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-label={HOLIDAY_TITLE}
            className="relative w-full max-w-[22rem] overflow-hidden rounded-[2rem] shadow-2xl sm:max-w-sm"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <HolidayPoster
              variant="popup"
              note="Limited stock. Order now."
              cta={
                <Link href={HOLIDAY_PATH} onClick={close} className={HOLIDAY_CTA_CLASS}>
                  See the gifts
                </Link>
              }
            />

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-cream backdrop-blur transition-colors hover:bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {/* Countdown: the bar's animation end is what closes the popup, so
                pausing the bar (hover/focus) pauses the timer too. */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15" aria-hidden>
              <div
                className="holiday-countdown h-full origin-left bg-[#e9c46a]"
                style={{
                  animationDuration: `${SHOW_FOR_MS}ms`,
                  animationPlayState: paused ? "paused" : "running"
                }}
                onAnimationEnd={close}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
