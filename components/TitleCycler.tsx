"use client";

import { useEffect } from "react";

// Cycles the browser tab title for a playful, on-brand touch.
const TITLES = ["Seasons by B 🐝", "London's Finest Beauty"];

export default function TitleCycler() {
  useEffect(() => {
    let i = 0;
    const original = document.title;
    const t = setInterval(() => {
      i = (i + 1) % TITLES.length;
      document.title = TITLES[i];
    }, 2500);
    return () => {
      clearInterval(t);
      document.title = original;
    };
  }, []);

  return null;
}
