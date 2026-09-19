// The Holiday Edit — the gifts and sets shown in the homepage "Holidays
// Special" section (and advertised by the load-time popup).
//
// To fill it: paste product uuid(s) into HOLIDAY_PRODUCT_IDS. They MUST exist
// in `products`; archived or unknown ids are skipped. Order here = order on the
// page. While the list is empty the section shows a "being wrapped" teaser
// instead of a product grid.

export const HOLIDAY_SECTION_ID = "holiday-special";
// Dedicated page listing every holiday set (the popup and homepage link here).
export const HOLIDAY_PATH = "/holiday";

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
  "be2fb8d4-49c7-4511-901c-f8200a9e1e2d", // Too Hot to Miss 5 Makeup Top Picks
  "997c72ff-b483-4c80-b0d6-46c14c171809", // Mask Mania 20 Masks from Head to Toe
  "e23f9b2a-7465-4723-af83-b2b8c9514b3c", // Makeup Setting Duo
  "4af4bf5b-27f9-4939-b3c3-cbe7a30971b0", // Size Up Squad Mascara Trio
  "97b4d810-babb-454f-9377-aed828fd8a9e", // Beauty Break Set 4 Skincare Must-Haves
  "8ab59a10-2efe-4985-a097-adfff4de7128", // Premium Advent Calendar 24 Surprises in a Vanity Case
  "5ad1250f-b4cb-4492-8c47-ef3824e62dc4", // MIST & Match Mini Perfume Mist Trio
  "806775d8-51ce-4154-b636-d70f5e4c9706", // Gloss Balm Trio 3 Tinted Lip Balms, Including 1 Exclusive Shade
  "a8269d87-f513-4fb3-91f6-60dc3cc66265", // Retractable Eyepen Duo 1 Black Pencil and 1 Brown Pencil
  "508403a5-b3dd-4387-aa67-3f7c53dd69c4", // Blush Blush Glow Set
  "06f787d6-a692-49ca-822b-bd5654f4a290", // Advent Calendar 24 Makeup, Skincare, and Accessories Surprises
  "f648b443-86a6-4880-9a1d-17f8730dc7e3", // The Selfcare Edit 8 Skincare Masks from Head to Toe
  "4171ed8f-d715-4077-b7b9-958804462340", // Cheek and Lip Tint Duo 2 Shades: Red and Burgundy
  "ea3a9072-0a22-484d-bb3a-28179b3ee61b", // Lash & Brow Duo
  // Sephora Favorites
  "83d02cc1-14ed-45ee-a125-c0b852f63020", // The Clean Routine
  // Benefit Cosmetics
  "01608ba2-b81b-4a63-a319-45ef6a6b883f", // BADgal Party Co. Mini Volumizing Lash Duo
  "0fecd450-57c9-44b1-a1b7-d0ee607a7729", // Lash & Bronze Duo
  "5a48faf6-e1d5-4e28-a459-66cab1f6017d", // The Brow Booth Full-Size & Mini Brow Trio
  "09d68636-15b6-471a-a4b5-15698e81aefe", // Beauty Star Cinema Full-Size & Mini Must-Haves
  "ac2dea60-137b-46ae-81fe-e850610d7c51", // Beneville Fruit Stand Mini Lash & Brow Duo
  "606d9aa6-8485-4f3e-bb1d-604e584785be", // The Lash Scoop Volumizing Mascara Duo
  "6e0b6085-58f1-422e-8e32-d7f11643f0f9", // You've Got Benetint Limited-Edition Tint Duo
  "52a66af5-8be8-4f60-8f44-22c0e19b865c", // Tint & Define Duo
  "56a55e2a-6664-498c-8b4d-5f830364ae8b", // Beauty Bus Stop Mini Cheek Palette
  "d7753664-0a07-4044-80a8-dd319b98c4ce", // The Hotel Beneville 24-Day Beauty Advent Calendar
  "8e255daf-889e-47f0-996a-a90e05d81af7", // Rhythm & Beauty Radio Full-Size & Mini Bestsellers Trio
  "46ff3e9a-cfea-432f-a025-8be97d257cad", // BADgal Hypetower Lash & Liner Duo
  "a44d5227-08dc-4b8e-9380-1f73311aed57", // The Beneville Times Lip & Lash Trio
  "1f34b9b7-725c-4947-9b12-ded2b1e7cf30", // BAD & Bouncy Volumizing Mascara Duo
  "fb67fe55-8b44-47fa-aaad-5af75f9a71c3", // Connect Pore
  "69f09181-f635-4958-a8f8-ff8d41932212", // Benebingo
  // Yves Saint Laurent
  "1bb27831-a748-4633-abfb-0ed710ae156f" // Lash Clash Duo Gift Set
];
