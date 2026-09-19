// The Holiday Edit — the gifts and sets shown in the homepage "Holidays
// Special" section (and advertised by the load-time popup).
//
// To fill it: paste product uuid(s) into HOLIDAY_PRODUCT_IDS. They MUST exist
// in `products`; archived or unknown ids are skipped. Order here = order on the
// page. While the list is empty the section shows a "being wrapped" teaser
// instead of a product grid.

export const HOLIDAY_SECTION_ID = "holiday-special";

export const HOLIDAY_TITLE = "The Holiday Edit";
export const HOLIDAY_SUBTITLE = "Gift sets and stocking fillers for everyone on your list.";

export const HOLIDAY_PRODUCT_IDS: string[] = [
  // Tarte
  "f4f74a5d-213a-4ab6-b561-0c0f26f01337", // Face Card Never Declines CC Undereye & Brush
  "440a0a9c-2b0f-42d2-bd52-a41161e63128", // Front Row Energy Travel Essentials
  "6799fc9c-ba39-4fa2-8531-18909fa1005e", // SPOTTED: The Icons Best-Sellers Set
  "14f31f99-8f95-41b7-9b36-efd01326a5ad", // You Know You Love Me Collector's Set
  "f2bada4a-3b55-4ae2-901e-cbda3ce950de", // Eyes on Me Mascara & Liner Clutch
  "f073c6c5-317a-4941-8069-02b82bdb1fc0", // Don't Kiss & Tell Maracuja Juicy Lip Trio
  "4f9b650e-bf5a-4fa9-885e-bc7df5b94b87", // XOXO Blush & Glow Macaron Trio
  // Sephora Collection
  "3fba47c5-e956-44b0-9b38-bb3b7baa2a0d", // Feeling Cherry Lip & Hand Cherry Duo
  "202e48d2-ffc1-401c-8c97-ef72a9383612", // Outrageous Charm Outrageous Plump Effect
  // Benefit Cosmetics
  "1f34b9b7-725c-4947-9b12-ded2b1e7cf30", // BAD & Bouncy Volumizing Mascara Duo
  "fb67fe55-8b44-47fa-aaad-5af75f9a71c3", // Connect Pore
  "69f09181-f635-4958-a8f8-ff8d41932212" // Benebingo
];
