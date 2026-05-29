import type { Metadata } from "next";
import ShadeFinderClient from "./ShadeFinderClient";

export const metadata: Metadata = {
  title: "Shade Finder — Seasons by B",
  description:
    "Find your perfect foundation and concealer shade. A 2-minute consultation that matches your skin tone, undertone and preferences to luxury beauty from London."
};

export default function ShadeFinderPage() {
  return <ShadeFinderClient />;
}
