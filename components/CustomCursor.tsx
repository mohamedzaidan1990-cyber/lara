"use client";

import { useEffect, useRef } from "react";
import { BeeSvg } from "./BeeMascot";

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

// A small bee that follows the mouse with buttery lerp movement, tilts in the
// direction of travel, rights itself when idle, grows on interactive elements,
// and leaves a gentle gold trailing dot. Desktop (fine pointer) only.
export default function CustomCursor() {
  const beeRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const scaleTarget = useRef(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let prevMx = mx;
    let bx = mx;
    let by = my;
    let tx = mx;
    let ty = my;
    let rot = 0;
    let scale = 1;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    // Event delegation: grow the bee over interactive elements.
    const interactive = "a, button, [role='button'], input, label, select, textarea";
    const onOver = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(interactive)) scaleTarget.current = 1.3;
    };
    const onOut = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(interactive)) scaleTarget.current = 1;
    };

    const loop = () => {
      bx = lerp(bx, mx, 0.18);
      by = lerp(by, my, 0.18);
      // Trailing dot lags ~80ms behind the bee.
      tx = lerp(tx, bx, 0.14);
      ty = lerp(ty, by, 0.14);

      const vx = mx - prevMx;
      prevMx = mx;
      const targetRot = Math.max(-28, Math.min(28, vx * 2));
      rot = lerp(rot, targetRot, 0.18);
      scale = lerp(scale, scaleTarget.current, 0.2);

      if (beeRef.current) {
        beeRef.current.style.transform = `translate3d(${bx - 16}px, ${by - 16}px, 0) rotate(${rot}deg) scale(${scale})`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx - 3}px, ${ty - 3}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mouseout", onOut, true);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mouseout", onOut, true);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="bee-cursor-dot" aria-hidden />
      <div ref={beeRef} className="bee-cursor" aria-hidden>
        <BeeSvg size={32} />
      </div>
    </>
  );
}
