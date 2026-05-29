"use client";

import { useEffect, useState } from "react";
import { BeeMascot } from "./BeeMascot";

const MESSAGES = [
  "Sourcing from London...",
  "Checking availability...",
  "Finding the finest...",
  "Almost ready..."
];

interface Props {
  // When false, renders inline (no fixed full-screen overlay).
  fullScreen?: boolean;
}

export default function BeeLoader({ fullScreen = true }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);

  const inner = <BeeMascot variant="loading" label={MESSAGES[i]} />;

  if (!fullScreen) {
    return <div className="flex w-full items-center justify-center py-16">{inner}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(255,253,245,0.88)" }}
      role="status"
      aria-live="polite"
    >
      {inner}
    </div>
  );
}
