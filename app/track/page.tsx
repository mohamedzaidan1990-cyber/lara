import type { Metadata } from "next";
import TrackClient from "./TrackClient";

export const metadata: Metadata = {
  title: "Track Your Order — Seasons by B",
  description: "Track your Seasons by B order with your order number."
};

export default function TrackPage() {
  return <TrackClient />;
}
