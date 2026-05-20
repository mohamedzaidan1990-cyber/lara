import { redirect } from "next/navigation";
import { ensureSchema, getSql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!isAdmin()) {
    redirect("/admin/login");
  }

  await ensureSchema();
  const sql = getSql();

  const totalRows = (await sql`select count(*)::int as n from products`) as Array<{ n: number }>;
  const lastRows = (await sql`select max(scraped_at) as last from products`) as Array<{ last: string | null }>;

  const total = totalRows[0]?.n ?? 0;
  const lastImport = lastRows[0]?.last ?? null;

  return <ImportClient totalProducts={total} lastImport={lastImport} />;
}
