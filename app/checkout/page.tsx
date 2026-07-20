import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import { getPublicOrderCount } from "@/lib/order-stats";

export const metadata: Metadata = {
  title: "Checkout — Seasons by B",
  description: "Complete your Seasons by B order."
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const whish = process.env.WHISH_NUMBER ?? "03055491";
  const orderCount = await getPublicOrderCount();
  return <CheckoutClient whish={whish} orderCount={orderCount} />;
}
