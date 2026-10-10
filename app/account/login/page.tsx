import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in — Seasons by B",
  description: "Log in with your phone number to see your orders and loyalty points."
};

export default async function AccountLoginPage() {
  const account = await getCurrentAccount().catch(() => null);
  if (account) redirect("/account");
  return <LoginClient />;
}
