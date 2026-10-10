// Validation for the admin reward create/update routes.

export interface RewardInput {
  title?: string;
  description?: string | null;
  points_cost?: number | string;
  reward_type?: string;
  discount_usd?: number | string | null;
  active?: boolean;
  sort_order?: number | string;
  product_ids?: string[];
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function parseReward(body: RewardInput):
  | { error: string }
  | { title: string; description: string | null; points_cost: number; reward_type: string; discount_usd: number | null; active: boolean; sort_order: number; product_ids: string[] } {
  const title = String(body.title ?? "").trim();
  const points_cost = Math.trunc(Number(body.points_cost));
  const reward_type = body.reward_type === "discount" ? "discount" : "free_item";
  const discount_usd = reward_type === "discount" ? Number(body.discount_usd) : null;
  const product_ids = Array.isArray(body.product_ids) ? body.product_ids.filter((id) => UUID_RE.test(String(id))) : [];
  if (!title) return { error: "Title is required." };
  if (!(points_cost > 0)) return { error: "Points cost must be a positive whole number." };
  if (reward_type === "discount" && !(Number(discount_usd) > 0)) return { error: "Enter the discount amount in $." };
  // Redemptions only apply to specified items, never the whole catalogue.
  if (!product_ids.length) return { error: "Attach at least one item this reward applies to." };
  return {
    title,
    description: String(body.description ?? "").trim() || null,
    points_cost,
    reward_type,
    discount_usd,
    active: body.active !== false,
    sort_order: Math.trunc(Number(body.sort_order)) || 0,
    product_ids
  };
}
