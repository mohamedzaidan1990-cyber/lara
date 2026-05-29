import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — Seasons by B",
  description: "Complete your Seasons by B order."
};

export default function CheckoutPage() {
  const whish = process.env.WHISH_NUMBER ?? "03055491";
  return <CheckoutClient whish={whish} />;
}
