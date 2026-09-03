# Duplicate products — merge report

Generated: 2026-09-03T00:53:59.538Z

- Products in table: **7750**
- Duplicate groups: **191**  (182 auto-merge, 9 held for review)
- Surplus rows to delete: **249**  → table ends at **7501**
- Auto-merge groups with a price conflict (name has size): **29** — kept price normalised to the highest
- product_variants to re-point: **303**
- stock_items to re-point: **0**

Canonical rule: code-referenced → price_locked → most product_variants → richest → newest scrape → lowest id.
`order_items`, `orders`, `customers` are never touched.

---

## Held for review (9) — NOT merged by --apply

Price disagrees and the name carries no size, so these may be genuinely
different sizes/variants. Decide each one manually.

### Creed — CREED For Him gift set  (2×)  ⚠️ price conflict

prices in group: $305.00, $383.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `4a3732a8-c7f0-44e1-864b-ca9b2ef48dc6`  $305.00 / $175.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/creed-creed-for-him-gift-set_R04221042/
DROP  `234f762e-c3e7-490e-92d0-3cf53ba5086a`  $383.00 / $220.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/creed-creed-for-him-gift-set_R04221043/

### Dior — Miss Dior Mini Miss Parfum Case  (4×)  ⚠️ price conflict

prices in group: $58.00, $53.00, $53.00, $53.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `7b387ffa-7d7e-48d5-a7bc-630a2b740c24`  $58.00 / $33.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/dior-miss-dior-mini-miss-parfum-case_R04436853/
DROP  `41a7ced8-2509-4322-80a3-5dab5bba3595`  $53.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dior-miss-dior-mini-miss-parfum-case_R04594088/
DROP  `ffc267c0-2612-47ca-8424-2acc7d4297f3`  $53.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dior-miss-dior-mini-miss-parfum-case_R04594089/
DROP  `d66560d6-6a2c-4276-9a58-4e2d0e3260f3`  $53.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dior-miss-dior-mini-miss-parfum-case_R04594090/

### Drowsy Sleep Co — Brand-embroidered padded silk sleep mask  (5×)  ⚠️ price conflict

prices in group: $128.00, $112.00, $128.00, $112.00, $128.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `0d7b18e0-ff25-4b8d-b87a-7f83ec1ff32c`  $128.00 / $80.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/drowsy-sleep-co-brand-embroidered-padded-silk-sleep-mask_R04413329/
DROP  `1c186bb7-4987-4622-9959-538fa13034bc`  $112.00 / $70.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/drowsy-sleep-co-brand-embroidered-padded-silk-sleep-mask_R04413333/
DROP  `96a7c270-6af8-4989-b5e1-c5847b7da645`  $128.00 / $80.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/drowsy-sleep-co-brand-embroidered-padded-silk-sleep-mask_R04413334/
DROP  `ddb05091-3642-4fbb-8a76-0fe801b8466d`  $112.00 / $70.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/drowsy-sleep-co-brand-embroidered-padded-silk-sleep-mask_R04230913/
DROP  `5f4208ad-a92c-4f9b-9f17-dceb74850778`  $128.00 / $80.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/drowsy-sleep-co-brand-embroidered-padded-silk-sleep-mask_R04413335/

### Gucci — Kids' Branded Woven Ballet Flats  (2×)  ⚠️ price conflict

prices in group: $694.00, $750.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `973a8552-0148-4df1-8617-38d4b05d91ee`  $694.00 / $435.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/gucci-kids-branded-woven-ballet-flats_R04582125/
DROP  `01be7a66-67ac-4e79-9435-30c997805e2f`  $750.00 / $470.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-kids-branded-woven-ballet-flats_R04582128/

### Jo Malone London — Cologne Intense discovery collection  (2×)  ⚠️ price conflict

prices in group: $36.00, $44.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `a2a7c7f3-8f03-4ec0-b321-d695b1285b09`  $36.00 / $18.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/jo-malone-london-cologne-intense-discovery-collection_R04194140/
DROP  `b472d2a9-4a34-4268-8202-cc067f3b57e7`  $44.00 / $25.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/jo-malone-london-cologne-intense-discovery-collection_R03966609/

### Le Labo — Thé Noir 29 eau de parfum  (2×)  ⚠️ price conflict

prices in group: $300.00, $131.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `33e3becf-a742-468e-ab80-500203398a96`  $300.00 / $172.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, bestseller)
      url: https://www.selfridges.com/GB/en/product/le-labo-the-noir-29-eau-de-parfum_1067-3005660-050PT29100/
DROP  `9aed5ba0-e4c6-4381-9684-a6149e25e833`  $131.00 / $75.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/le-labo-the-noir-29-eau-de-parfum_1067-3005660-015PT29100/

### Seletti — Seletti wears Toiletpaper lipstick-print faux-leather case  (2×)  ⚠️ price conflict

prices in group: $46.00, $64.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `394fb296-86ef-4a13-ac69-f41a52b568ec`  $46.00 / $27.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/seletti-seletti-wears-toiletpaper-lipstick-print-faux-leather-case_R00066755/
DROP  `485b407d-c1b1-44bf-9198-81d0ebf00cf5`  $64.00 / $40.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/seletti-seletti-wears-toiletpaper-lipstick-print-faux-leather-case_R00066759/

### Sisley — Phyto-Lèvres Perfect lip pencil  (2×)  ⚠️ price conflict

prices in group: $83.00, $82.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `746d37b0-4241-448c-8496-c7ac6a9d819a`  $83.00 / $52.00  locked=false  variants=7  stock=0  scraped=2026-07-01
      reason: owns 7 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-legravevres-perfect-lip-pencil_466-85075701-LEVRESPERFECT/
DROP  `b64a44d3-e3a9-4493-befc-756f24351e26`  $82.00 / $51.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-levres-perfect-lip-pencil_466-3002705-187618/

### Versace — Eros Pour Homme eau de parfum  (2×)  ⚠️ price conflict

prices in group: $227.00, $145.00
→ **held for review** — no size in name, may be different sizes/variants; NOT merged

KEEP  `80e1949d-70cf-439b-85d7-f5af2349e821`  $227.00 / $130.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/versace-eros-pour-homme-eau-de-parfum_R03905888/
DROP  `b06c57fb-ec4b-423c-80df-ea099a9624a4`  $145.00 / $83.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/versace-eros-pour-homme-eau-de-parfum_R03747559/

---

## Auto-merge (182)

### Acqua Di Parma — Buongiorno Eau de Parfum 100ml  (2×)

KEEP  `ae4ae2c6-0f0a-4fb2-b68c-b89c6846c54a`  $387.00 / $222.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-buongiorno-eau-de-parfum-100ml_R04461199/
DROP  `61c778fc-ab4f-465c-b457-897b33ef372c`  $387.00 / $222.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-buongiorno-eau-de-parfum-100ml_R04595322/

### Acqua Di Parma — Buongiorno Eau de Parfum 500ml  (2×)

KEEP  `1ac8ed05-9c47-44e5-8edb-5ea9cd5b4b90`  $992.00 / $570.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-buongiorno-eau-de-parfum-500ml_R04461195/
DROP  `84962198-1307-41ac-8763-388db7d60eb1`  $992.00 / $570.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-buongiorno-eau-de-parfum-500ml_R04595323/

### Acqua Di Parma — Fico Di Amalfi Eau de Toilette 100ml  (2×)

KEEP  `e72260ab-e040-4989-ae63-239823b744de`  $272.00 / $156.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-fico-di-amalfi-eau-de-toilette-100ml_R04595311/
DROP  `2d83a58a-ed8b-4b6d-a018-3bda12f80f1e`  $272.00 / $156.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-fico-di-amalfi-eau-de-toilette-100ml_R04665940/

### Acqua Di Parma — Fico Di Amalfi La Riserva Eau de Parfum 50ml  (2×)  ⚠️ price conflict

prices in group: $387.00, $255.00
→ price stays **$387.00** (already the highest)

KEEP  `1c605ea2-dc33-4c50-a02b-ed2fc54cea7f`  $387.00 / $222.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-fico-di-amalfi-la-riserva-eau-de-parfum-50ml_R04489944/
DROP  `153003ac-e275-4596-92cc-d1c6820fe7b3`  $255.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-fico-di-amalfi-la-riserva-eau-de-parfum-50ml_R04489943/

### Acqua Di Parma — Luce Di Rosa Eau de Parfum 180ml  (2×)

KEEP  `548f0f5a-4b3b-4493-9e8c-c12d54df70e4`  $569.00 / $327.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-luce-di-rosa-eau-de-parfum-180ml_R04595321/
DROP  `1933e01e-6357-4fcc-8877-869d32ae99e8`  $569.00 / $327.00  locked=false  variants=0  stock=0  scraped=2026-06-23
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-luce-di-rosa-eau-de-parfum-180ml_R04373291/

### Acqua Di Parma — Mandarino Di Sicilia Eau de Toilette 180ml  (2×)

KEEP  `daf5b902-1630-4166-993a-082d712a32d2`  $350.00 / $201.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-mandarino-di-sicilia-eau-de-toilette-180ml_R04324348/
DROP  `b1799302-7679-420b-8684-f0f4f099a614`  $350.00 / $201.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/acqua-di-parma-mandarino-di-sicilia-eau-de-toilette-180ml_R04595319/

### Amika — Frizz-Me-Not Hydrating Anti-Frizz Treatment 200ml  (2×)  ⚠️ price conflict

prices in group: $20.00, $47.00
→ price normalised to **$47.00** (highest in group)

KEEP  `249dc9dc-7aa5-44ac-9d13-d07e07d1c8b9`  $20.00 / $10.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/amika-frizz-me-not-hydrating-anti-frizz-treatment-200ml_R04605612/
DROP  `bed53563-5773-460a-99d3-fdb6a8cc1df2`  $47.00 / $28.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/amika-frizz-me-not-hydrating-anti-frizz-treatment-200ml_R04605613/

### Augustinus Bader — The Starter Kit With The Rich Cream Worth £191  (2×)

KEEP  `92bbc448-7fc8-464c-9632-021495ef3d2c`  $280.00 / $175.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/augustinus-bader-the-starter-kit-with-the-rich-cream-worth-191_R03958511/
DROP  `3001b1cf-9fd6-413f-a237-10701ed2e95d`  $280.00 / $175.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/augustinus-bader-the-starter-kit-with-the-rich-cream-worth-191_R03958510/

### Away — Clear Woven Cosmetic Case  (3×)

KEEP  `fd5a5a6f-2f27-4e32-bd68-93aa85a0f2d9`  $125.00 / $78.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/away-clear-woven-cosmetic-case_R04659831/
DROP  `d00a59f4-caf2-4141-b112-85fcade5744a`  $125.00 / $78.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/away-clear-woven-cosmetic-case_R04659830/
DROP  `cda3e173-69b3-4d98-a146-cfafd95b36c4`  $125.00 / $78.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/away-clear-woven-cosmetic-case_R04659829/

### Bobbi Brown — Glow with Love Luxe Matte liquid lipstick  (2×)

KEEP  `5f1ba28d-71be-4fce-997a-32cec5da23c5`  $61.00 / $36.00  locked=false  variants=12  stock=0  scraped=2026-06-29
      reason: owns 12 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-glow-with-love-luxe-matte-liquid-lipstick_R04348387/
DROP  `44677e83-e46e-4add-9d56-90ae64751e14`  $61.00 / $36.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-glow-with-love-luxe-matte-liquid-lipstick_R04348390/
      → 3 variants re-pointed to KEEP

### Bobbi Brown — Lip pencil 1g  (2×)

KEEP  `c10b054a-5203-49e3-a476-c5dde0427e2e`  $46.00 / $27.00  locked=false  variants=9  stock=0  scraped=2026-07-01
      reason: owns 9 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-lip-pencil-1g_299-85076589-LIPPENCIL/
DROP  `bc6203a0-985b-428f-9b53-c58ec314312f`  $46.00 / $27.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-lip-pencil-1g_R04501049/
      → 6 variants re-pointed to KEEP

### Bobbi Brown — Long-Wear Cream Shadow Stick 1.6g  (2×)

KEEP  `fe1acb84-8338-48dc-bbce-b9939da85092`  $50.00 / $29.50  locked=false  variants=32  stock=0  scraped=2026-07-01
      reason: owns 32 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-long-wear-cream-shadow-stick-16g_R04158224/
DROP  `f35b1b47-9e90-408e-b82a-148e611b4217`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-long-wear-cream-shadow-stick-16g_R04518522/

### Bobbi Brown — Luxe Matte lipstick 3.5g  (2×)

KEEP  `090ab4d4-0f4a-4344-812a-f2e75700e82a`  $61.00 / $36.00  locked=false  variants=16  stock=0  scraped=2026-07-01
      reason: owns 16 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-luxe-matte-lipstick-35g_R04245899/
DROP  `d6c09319-7147-4db1-be71-f909946cf710`  $61.00 / $36.00  locked=false  variants=15  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-luxe-matte-lipstick-35g_R04501004/
      → 15 variants re-pointed to KEEP

### Bobbi Brown — Pot Rouge Velvet Matte Blush 8.5g  (3×)

KEEP  `8f1a9e76-48c9-489a-a2bc-a89520ef3880`  $54.00 / $32.00  locked=false  variants=7  stock=0  scraped=2026-07-01
      reason: owns 7 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-pot-rouge-velvet-matte-blush-85g_R04467745/
DROP  `d10b7e23-2676-4d76-acc6-8a7d22951d2a`  $54.00 / $32.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-pot-rouge-velvet-matte-blush-85g_R04465495/
      → 1 variants re-pointed to KEEP
DROP  `ffeb871b-bbeb-4279-8853-f6764ddf7519`  $54.00 / $32.00  locked=false  variants=1  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/bobbi-brown-pot-rouge-velvet-matte-blush-85g_R04465500/
      → 1 variants re-pointed to KEEP

### Burberry — Beyond Wear Finishing & Smoothing Loose Powder 20g  (2×)

KEEP  `4ca27a9e-4c65-49c2-a869-1f9d6e4d41b6`  $74.00 / $46.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/burberry-beyond-wear-finishing-smoothing-loose-powder-20g_R04575842/
DROP  `cb72a156-2c5a-4cb4-b87e-24b2f0fa510e`  $74.00 / $46.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/burberry-beyond-wear-finishing-smoothing-loose-powder-20g_R04575840/
      → 1 variants re-pointed to KEEP

### Burberry — Brit Shine lipstick 3g  (3×)

KEEP  `e1906119-1a46-4bf4-966f-0cfaefddb018`  $62.00 / $37.00  locked=false  variants=14  stock=0  scraped=2026-07-01
      reason: owns 14 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/burberry-brit-shine-lipstick-3g_R04344324/
DROP  `d1c190ce-9061-4476-8eb8-fb3cff423b40`  $62.00 / $37.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/burberry-brit-shine-lipstick-3g_R04632971/
      → 5 variants re-pointed to KEEP
DROP  `ec13954c-73f6-45c5-8eff-41b7e3b1e298`  $62.00 / $37.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/burberry-brit-shine-lipstick-3g_R04519105/
      → 1 variants re-pointed to KEEP

### Burberry — Furley Checked Rubber Sliders  (2×)

KEEP  `3ad023b6-8721-432f-8ea4-0d34128e9486`  $519.00 / $325.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/burberry-furley-checked-rubber-sliders_R04440052/
DROP  `81b3ac52-3ce9-479a-a3e5-6a6e9f620c6c`  $519.00 / $325.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/burberry-furley-checked-rubber-sliders_R04632719/

### Burberry — Her eau de toilette 50ml  (2×)  ⚠️ price conflict

prices in group: $154.00, $211.00
→ price normalised to **$211.00** (highest in group)

KEEP  `196dc403-6ec3-461b-b2f0-e5e5963bf468`  $154.00 / $88.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/burberry-her-eau-de-toilette-50ml_R03899190-S/
DROP  `f1f39fc8-6e71-499b-aeee-d95d849f25c4`  $211.00 / $121.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/burberry-her-eau-de-toilette-50ml_R03899190/

### Burberry — Johane Check-Collar Cotton-Piqué Polo Shirt 3-14 Years  (2×)

KEEP  `e0c35201-bfe0-4c24-8d5b-9d183d9b18bd`  $304.00 / $190.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/burberry-johane-check-collar-cotton-pique-polo-shirt-3-14-years_R04474437/
DROP  `f7b94801-d1b4-423f-971d-87020fe3399e`  $304.00 / $190.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/burberry-johane-check-collar-cotton-pique-polo-shirt-3-14-years_R04474438/

### Burberry — Manston checked silk tie  (2×)

KEEP  `10d2e19a-d89b-479e-b864-e9b6c71c65e6`  $272.00 / $170.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/burberry-manston-checked-silk-tie_R04316010/
DROP  `6eca7152-08ed-4745-92fb-dc6eb3c9649b`  $272.00 / $170.00  locked=false  variants=0  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/burberry-manston-checked-silk-tie_R04316009/

### By Terry — Crayon Blackstar eye pencil 1.2g  (2×)

KEEP  `8079b9e6-6d84-43bc-8d5a-046e3fd623f4`  $42.00 / $25.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/by-terry-crayon-blackstar-eye-pencil-12g_R03942388/
DROP  `6e462bc7-4afb-4278-a4f9-c3224a784820`  $42.00 / $25.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-crayon-blackstar-eye-pencil-12g_R04152495/
      → 1 variants re-pointed to KEEP

### By Terry — Hyaluronic Hydra-Powder multi-purpose palette 10g  (2×)

KEEP  `718d2f83-dd63-4e14-92c6-3792d200d5ef`  $85.00 / $53.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/by-terry-hyaluronic-hydra-powder-multi-purpose-palette-10g_R03824644/
DROP  `b93414d5-4eaf-4c4a-8a33-26dcb2f09c43`  $85.00 / $53.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-hyaluronic-hydra-powder-multi-purpose-palette-10g_R03824645/

### By Terry — Tea To Tan Blush Powder 7g  (6×)

KEEP  `5099d1e0-4b5a-4536-9354-d5eed84942c6`  $72.00 / $45.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471278/
DROP  `f3b0d863-85e9-4869-8163-a7de891347ac`  $72.00 / $45.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471277/
      → 1 variants re-pointed to KEEP
DROP  `f32fcf96-3445-4329-aa76-55e951d76ead`  $72.00 / $45.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471276/
      → 1 variants re-pointed to KEEP
DROP  `3c8bfc85-8fc8-45af-ac6b-db49a4e24ae4`  $72.00 / $45.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471275/
      → 1 variants re-pointed to KEEP
DROP  `b40a3dd9-2179-4644-8958-a8a58d0d3109`  $72.00 / $45.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471279/
      → 1 variants re-pointed to KEEP
DROP  `73624ab1-ccdb-424c-9e68-9a733acccb91`  $72.00 / $45.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/by-terry-tea-to-tan-blush-powder-7g_R04471273/

### Chanel — LE CRAYON LÈVRES Longwear Lip Pencil 1.2g  (2×)  ⚠️ price conflict

prices in group: $46.00, $49.00
→ price normalised to **$49.00** (highest in group)

KEEP  `c50415aa-947f-4454-a91d-4714ec88eb9a`  $46.00 / $27.00  locked=false  variants=13  stock=0  scraped=2026-07-01
      reason: owns 13 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-crayon-levresstrong-longwear-lip-pencil-12g_R04183835/
DROP  `6e78fecf-f6c9-43f5-b213-8727f478d7d3`  $49.00 / $29.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-crayon-levresstrong-longwear-lip-pencil-12g_R04611081/
      → 8 variants re-pointed to KEEP

### Chanel — Le Liner de Chanel Liquid Eye Liner 2.5ml  (3×)

KEEP  `00adaffc-425d-47c6-b69c-2544fb0c3dc5`  $62.00 / $37.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-le-liner-de-chanel-liquid-eye-liner-25ml_R04535619/
DROP  `005689a0-2965-45ac-b36b-edb9ec3fdde1`  $62.00 / $37.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/chanel-le-liner-de-chanel-liquid-eye-liner-25ml_R04535620/
      → 1 variants re-pointed to KEEP
DROP  `d5bac96a-265c-4e8e-b0e3-fc239cf7b718`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-le-liner-de-chanel-liquid-eye-liner-25ml_R04535621/

### Chanel — LE ROUGE DUO ULTRA TENUE Ultra Wear Liquid Lip Colour 8ml  (2×)  ⚠️ price conflict

prices in group: $67.00, $69.00
→ price normalised to **$69.00** (highest in group)

KEEP  `04a30143-87a4-44ea-af67-3274dc06b88b`  $67.00 / $42.00  locked=false  variants=13  stock=0  scraped=2026-07-01
      reason: owns 13 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-rouge-duo-ultra-tenuestrong-ultra-wear-liquid-lip-colour-8ml_R03663204/
DROP  `252329df-cdc4-4dcf-9931-a7d7fc10250b`  $69.00 / $43.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/chanel-le-rouge-duo-ultra-tenue-ultra-wear-liquid-lip-colour-8ml_R04662657/
      → 1 variants re-pointed to KEEP

### Chanel — LE VERNIS Longwear Nail Colour 13ml  (3×)

KEEP  `7fe3c48e-4985-4429-9d9a-731e430ccd3a`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-le-vernis-longwear-nail-colour-13ml_R04641424/
DROP  `454ffe65-8f82-414e-bded-31ed2b83d0d0`  $51.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-le-vernis-longwear-nail-colour-13ml_R04659795/
DROP  `49c24033-3dcf-4917-b7ea-77b1a821e593`  $51.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-le-vernis-longwear-nail-colour-13ml_R04659790/

### Chanel — LE VERNIS Nail Colour 13ml  (3×)  ⚠️ price conflict

prices in group: $51.00, $51.00, $49.00
→ price stays **$51.00** (already the highest)

KEEP  `34159551-72d0-47e3-8a22-d8a2bc4ae622`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-vernisstrong-nail-colour-13ml_R04271489/
DROP  `cfa54c57-d512-47c4-ad96-defabadbb188`  $51.00 / $30.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-vernisstrong-nail-colour-13ml_R04432636/
      → 1 variants re-pointed to KEEP
DROP  `98064f9a-845f-4912-ab08-9dd441d80e8f`  $49.00 / $29.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-strongle-vernisstrong-nail-colour-13ml_R04163486/

### Chanel — NOIR ALLURE All-in-One Mascara: Volume, Length, Curl and Definition 6g  (2×)

KEEP  `b2b8449a-f219-4d9c-b3bc-c40f1cb7aa2e`  $67.00 / $42.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-strongnoir-allurestrong-all-in-one-mascara-volume-length-curl-and-definition-6g_R04003023/
DROP  `29b93f60-e5c3-4fbe-adaf-089d1998216e`  $67.00 / $42.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/chanel-noir-allure-all-in-one-mascara-volume-length-curl-and-definition-6g_R04659792/
      → 1 variants re-pointed to KEEP

### Chanel — ROUGE COCO FLASH Colour, Shine, Intensity In A Flash Lipstick 3g  (2×)  ⚠️ price conflict

prices in group: $69.00, $67.00
→ price stays **$69.00** (already the highest)

KEEP  `cf59ba2d-5708-4ea3-9027-5707271b6f75`  $69.00 / $43.00  locked=false  variants=17  stock=0  scraped=2026-07-01
      reason: owns 17 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/chanel-strongrouge-coco-flashstrong-colour-shine-intensity-in-a-flash-lipstick-3g_437-73004626-ROUGECOCOFLASH/
DROP  `510bd4b4-12e0-4e57-831e-674bd11fac1e`  $67.00 / $42.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/chanel-strongrouge-coco-flashstrong-colour-shine-intensity-in-a-flash-lipstick-3g_R04573507/
      → 1 variants re-pointed to KEEP

### Charlotte Tilbury — Lip Cheat Contour Duo 10g  (3×)

KEEP  `a706f2a8-0ed9-4101-b94d-b6c60912ed7e`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-lip-cheat-contour-duo-10g_R04470166/
DROP  `295263d0-1d51-423a-834b-cbc83dcee902`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-lip-cheat-contour-duo-10g_R04470165/
      → 1 variants re-pointed to KEEP
DROP  `7f973695-2976-4687-b7f8-c765f655b3b5`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-lip-cheat-contour-duo-10g_R04470167/
      → 1 variants re-pointed to KEEP

### Charlotte Tilbury — Lip Cheat re-shape & re-size lip liner  (2×)

KEEP  `86aca336-57f8-44e0-a772-895ea4badf81`  $40.00 / $22.00  locked=false  variants=19  stock=0  scraped=2026-07-01
      reason: owns 19 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-lip-cheat-re-shape-re-size-lip-liner_455-3003231-LIPCHEAT/
DROP  `0f0124fd-2b13-4909-86f3-f093887ea3c0`  $40.00 / $22.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-lip-cheat-re-shape-re-size-lip-liner_R04270000/
      → 2 variants re-pointed to KEEP

### Charlotte Tilbury — Rock 'n' Kohl Eye Pencil 1.2g  (2×)

KEEP  `d2344b26-ed60-496f-923d-f094b4d2b58d`  $44.00 / $26.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-rock-n-kohl-eye-pencil-12g_R04472631/
DROP  `09145f16-4fca-4b13-9852-6e9d14b574c7`  $44.00 / $26.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-rock-n-kohl-eye-pencil-12g_R04472628/
      → 1 variants re-pointed to KEEP

### Charlotte Tilbury — The Feline Flick liquid eyeliner  (2×)

KEEP  `4fe735b4-a9f0-486d-8eb8-a25bf29ab904`  $44.00 / $26.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-the-feline-flick-liquid-eyeliner_R00121178/
DROP  `2c14e550-a77f-4031-b542-35e405499534`  $44.00 / $26.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/charlotte-tilbury-the-feline-flick-liquid-eyeliner_455-3003231-THEFELINEFLICK/
      → 1 variants re-pointed to KEEP

### Clarins — Skin Illusion Tinted Moisturiser 40ml  (2×)

KEEP  `eddf765a-99ad-42c1-bab9-d6265a621e4e`  $64.00 / $40.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/clarins-skin-illusion-tinted-moisturiser-40ml_R04449735/
DROP  `367234f4-b2fc-4fdb-90dc-5044369a4468`  $64.00 / $40.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/clarins-skin-illusion-tinted-moisturiser-40ml_R04449736/
      → 1 variants re-pointed to KEEP

### Clinique — Almost Lipstick 1.9g  (2×)

KEEP  `2e40edf8-ffaf-4993-9eb0-0d635af4f975`  $42.00 / $25.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/clinique-almost-lipstick-19g_R04267197/
DROP  `3fa75aa9-5f17-4a99-8813-1c955a09e1c4`  $42.00 / $25.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/clinique-almost-lipstick-19g_R04496375/
      → 1 variants re-pointed to KEEP

### Color Wow — Root Cover Up 2.1g  (4×)

KEEP  `2748b033-681e-41ab-8eb8-e6e70ecfd34e`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/color-wow-root-cover-up-21g_R04626247/
DROP  `0a1a2523-ca73-4ae0-8f0c-1c1993d8d3bf`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/color-wow-root-cover-up-21g_R04626246/
DROP  `3643f788-bdc5-4f3d-9e65-478a213a0d2f`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/color-wow-root-cover-up-21g_R04586839/
DROP  `6d41e2f6-3370-4f43-900e-e9d6bb38887d`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/color-wow-root-cover-up-21g_R03788433/

### Coola Suncare — Classic SPF30 sunscreen spray 177ml  (2×)

KEEP  `9bd44773-41e8-4bdc-92c5-b8d56b94c11b`  $46.00 / $27.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/coola-suncare-classic-spf30-sunscreen-spray-177ml_R03938046/
DROP  `98107056-24e9-4514-bc93-277157ad8f5b`  $46.00 / $27.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/coola-suncare-classic-spf30-sunscreen-spray-177ml_R03938047/

### Cosrx — AHA/BHA Clarifying Treatment Toner 150ml  (2×)

KEEP  `f516581e-d650-4a32-bab4-2a5cf0a5e2a1`  $40.00 / $19.99  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, k_beauty)
      url: https://www.selfridges.com/GB/en/product/cosrx-ahabha-clarifying-treatment-toner-150ml_R04585394/
DROP  `c0ed0075-4bfa-4d00-b830-294b955f9c33`  $40.00 / $19.99  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/cosrx-ahabha-clarifying-treatment-toner-150ml_R03665245/

### Cosrx — Low pH Good Morning Gel Cleanser 150ml  (2×)

KEEP  `abd474d2-3727-48f5-89d7-179417c0e0d1`  $28.00 / $13.99  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, k_beauty)
      url: https://www.selfridges.com/GB/en/product/cosrx-low-ph-good-morning-gel-cleanser-150ml_R04585401/
DROP  `a3ab0a25-fe64-46f7-9251-24b79db094cc`  $28.00 / $13.99  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/cosrx-low-ph-good-morning-gel-cleanser-150ml_R03665246/

### Diptyque — Eau des sens eau de toilette 100ml  (2×)

KEEP  `7c4ba56a-3d1e-4ce6-b8b9-b511c8c60bfe`  $253.00 / $145.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, bestseller)
      url: https://www.selfridges.com/GB/en/product/diptyque-eau-des-sens-eau-de-toilette-100ml_342-2000170-SENS100V1/
DROP  `62dae351-6b4b-484f-8199-f9f5c9a58d28`  $253.00 / $145.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/diptyque-eau-des-sens-eau-de-toilette-100ml_R04648999/

### Diptyque — Eau des Sens hair mist 30ml  (2×)

KEEP  `47312b27-51de-4b71-b1ad-9929ae7087bd`  $108.00 / $62.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/diptyque-eau-des-sens-hair-mist-30ml_342-2000170-SENSHMIST/
DROP  `2012fc18-9303-409b-82b8-b99f6aeb3c6f`  $108.00 / $62.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/diptyque-eau-des-sens-hair-mist-30ml_R04648995/

### Dr. Barbara Sturm — Face Cream 50ml  (2×)  ⚠️ price conflict

prices in group: $232.00, $240.00
→ price normalised to **$240.00** (highest in group)

KEEP  `d2a62989-27ca-4104-bb75-c4d3a9abe75b`  $232.00 / $145.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/dr-barbara-sturm-face-cream-50ml_R00049942/
DROP  `1aa50f47-11c6-467f-8247-f3d1dda3a717`  $240.00 / $150.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dr-barbara-sturm-face-cream-50ml_R00049917/

### Dries Van Noten — Lip Balm Refill 3.5g  (3×)

KEEP  `fbad0b85-7f14-48f5-8357-d8ff2f35518c`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/dries-van-noten-lip-balm-refill-35g_R04668531/
DROP  `21594642-bb24-41f1-a56f-0331da16a3ac`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dries-van-noten-lip-balm-refill-35g_R04668530/
DROP  `949793e9-3a7b-4b36-8c78-2a6963954a77`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/dries-van-noten-lip-balm-refill-35g_R04668529/

### Fara Homidi — Essential Lip Compact 3.7g  (2×)

KEEP  `e89cd971-2b8e-44e6-81e6-b3afeb27cfc8`  $133.00 / $83.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/fara-homidi-essential-lip-compact-37g_R04571992/
DROP  `c8133b7e-9f5e-482a-a07c-9f13eca0f541`  $133.00 / $83.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/fara-homidi-essential-lip-compact-37g_R04529761/

### First Aid Beauty — Ultra Repair Cream 56.7g  (2×)  ⚠️ price conflict

prices in group: $36.00, $32.00
→ price stays **$36.00** (already the highest)

KEEP  `197b551d-ab5d-4e3c-8f33-ec8d2708fc4e`  $36.00 / $18.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/first-aid-beauty-ultra-repair-cream-567g_R04632136/
DROP  `5f56eb7a-46cc-4e8f-8835-4fcb3e58c3a6`  $32.00 / $16.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/first-aid-beauty-ultra-repair-cream-567g_475-3004302-223UK/

### Fresh — Sugar Advanced Therapy lip mask 10g  (2×)  ⚠️ price conflict

prices in group: $44.00, $41.00
→ price stays **$44.00** (already the highest)

KEEP  `49583113-023f-444d-9681-027f71c1c63a`  $44.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/fresh-sugar-advanced-therapy-lip-mask-10g_R04355378/
DROP  `62853bf0-e38a-4e11-920f-9967ae182cdf`  $41.00 / $24.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/fresh-sugar-advanced-therapy-lip-mask-10g_R04355377/

### Fresh — Sugar Treat Lip Oil Limited Edition 4ml  (2×)

KEEP  `d754353e-2204-4bd3-8af7-a0f3b0eac7d3`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/fresh-sugar-treat-lip-oil-limited-edition-4ml_R04545388/
DROP  `ff11fd49-0d7c-403a-9f95-14b159103bf8`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/fresh-sugar-treat-lip-oil-limited-edition-4ml_R04545387/
      → 1 variants re-pointed to KEEP

### Ghd — Duet Blowdry hair dryer brush  (2×)

KEEP  `7261b936-c6e1-41df-af6f-b2c3fca247c2`  $605.00 / $379.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/ghd-duet-blowdry-hair-dryer-brush_R04357281/
DROP  `44caefca-a20b-4b03-9570-7d1de4b4ad2c`  $605.00 / $379.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/ghd-duet-blowdry-hair-dryer-brush_R04357280/

### Ghd — Duet Style Two-In-One Hot Air Styler  (2×)

KEEP  `c777bd63-0a7b-4657-9a33-f0f9edf8a2fa`  $605.00 / $379.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/ghd-duet-style-two-in-one-hot-air-styler_R04120856/
DROP  `89a9ce8a-6cac-45bc-a8c7-61d578723a5c`  $605.00 / $379.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/ghd-duet-style-two-in-one-hot-air-styler_R04120855/

### Ghd — Speed Hairdryer  (2×)

KEEP  `9f343367-14c9-4046-93ac-de84a97546fb`  $477.00 / $299.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/ghd-speed-hairdryer_R04596720/
DROP  `1961e4b4-f8f5-4f53-91d5-7aa272f75c2f`  $477.00 / $299.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/ghd-speed-hairdryer_R04596721/

### Giorgio Armani — Crema Nera Foundation Refill 30ml  (3×)

KEEP  `78fc664f-c4dd-43fe-a9ea-1299ca875deb`  $200.00 / $125.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-crema-nera-foundation-refill-30ml_R04383776/
DROP  `728f95bf-72bf-4b7a-bcd2-f344237326f1`  $200.00 / $125.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-crema-nera-foundation-refill-30ml_R04383772/
      → 1 variants re-pointed to KEEP
DROP  `782c0745-ccde-4643-b3a2-09ae3637a276`  $200.00 / $125.00  locked=false  variants=1  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-crema-nera-foundation-refill-30ml_R04383774/
      → 1 variants re-pointed to KEEP

### Giorgio Armani — Lip Power lipstick 3.1g  (2×)

KEEP  `ac48df79-1060-4368-b753-29ec1b190192`  $64.00 / $40.00  locked=false  variants=11  stock=0  scraped=2026-06-29
      reason: owns 11 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-lip-power-lipstick-31g_R03791499/
DROP  `77f97f20-d33e-4b6f-96ab-ed2212729cc1`  $64.00 / $40.00  locked=false  variants=9  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-lip-power-lipstick-31g_R03822703/
      → 9 variants re-pointed to KEEP

### Giorgio Armani — Luminous Silk cheek tint 18ml  (3×)  ⚠️ price conflict

prices in group: $63.00, $61.00, $63.00
→ price stays **$63.00** (already the highest)

KEEP  `c622739b-e94f-4c14-b87e-a048ef67dc4d`  $63.00 / $39.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-luminous-silk-cheek-tint-18ml_R04313759/
DROP  `432d92d0-5cbc-4158-864a-cd680e0f75e2`  $61.00 / $38.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-luminous-silk-cheek-tint-18ml_R04464785/
      → 5 variants re-pointed to KEEP
DROP  `cc2422c8-260a-4b01-b496-2656f68e270c`  $63.00 / $39.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-luminous-silk-cheek-tint-18ml_R04668055/
      → 4 variants re-pointed to KEEP

### Giorgio Armani — Luminous Silk Concealer 12ml  (2×)  ⚠️ price conflict

prices in group: $63.00, $64.00
→ price normalised to **$64.00** (highest in group)

KEEP  `2baa4669-0cee-498c-841a-cda9498c9f66`  $63.00 / $39.00  locked=false  variants=22  stock=0  scraped=2026-07-01
      reason: owns 22 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-luminous-silk-concealer-12ml_R00108002/
DROP  `efded003-48df-470d-8a47-d5bb496c0300`  $64.00 / $40.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/giorgio-armani-luminous-silk-concealer-12ml_R04668054/
      → 2 variants re-pointed to KEEP

### Gisou — Honey Infused Lip Oil 8ml  (3×)

KEEP  `3e45d320-06b8-4173-bf4b-1ee01b1a7099`  $41.00 / $24.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/gisou-honey-infused-lip-oil-8ml_R04473908/
DROP  `605e5ecb-3251-48a6-a12f-321566fef83d`  $41.00 / $24.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gisou-honey-infused-lip-oil-8ml_R04533678/
      → 3 variants re-pointed to KEEP
DROP  `0cd6502c-1dcf-4858-975d-e78b10b3e5be`  $41.00 / $24.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gisou-honey-infused-lip-oil-8ml_R04632470/

### Gucci — GC002111 Rectangle-Frame Metal Eyeglasses  (2×)

KEEP  `6cadbc68-17b7-45a2-9ad6-2230ae6f2aee`  $615.00 / $385.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/gucci-gc002111-rectangle-frame-metal-eyeglasses_R04647701/
DROP  `d26ceeff-8bf6-4e44-9198-c8591bba2713`  $615.00 / $385.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-gc002111-rectangle-frame-metal-eyeglasses_R04647700/

### Gucci — GC002723 Cat-Eye Acetate Eyeglasses  (2×)

KEEP  `bab64bfa-df18-41f6-88ef-1759c6c58116`  $527.00 / $330.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/gucci-gc002723-cat-eye-acetate-eyeglasses_R04647703/
DROP  `95b8f996-b916-4128-b651-18aa486ca8cb`  $527.00 / $330.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-gc002723-cat-eye-acetate-eyeglasses_R04647704/

### Gucci — GC002759 Round-Frame Acetate Eyeglasses  (2×)

KEEP  `5f029153-d673-451e-9781-ef65f2f9520e`  $423.00 / $265.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/gucci-gc002759-round-frame-acetate-eyeglasses_R04647705/
DROP  `3016b785-ff6f-462f-8d7c-0e66e44da5f4`  $423.00 / $265.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-gc002759-round-frame-acetate-eyeglasses_R04647706/

### Gucci — Rouge à Lèvres matte lipstick 3.5g  (4×)

KEEP  `ed2e16d0-a8a9-4079-b598-7a28a9d518e7`  $64.00 / $40.00  locked=false  variants=20  stock=0  scraped=2026-06-25
      reason: owns 20 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-matte-lipstick-35g_R00191111/
DROP  `50e3d613-6839-465c-9e08-c8c3ec6f3c46`  $64.00 / $40.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-matte-lipstick-35g_R04304517/
      → 6 variants re-pointed to KEEP
DROP  `d7f2675b-b64c-48ce-84c4-43086a76c524`  $64.00 / $40.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-matte-lipstick-35g_R04575958/
      → 1 variants re-pointed to KEEP
DROP  `7fa275b7-8406-43c9-8d28-72243c3454f6`  $64.00 / $40.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-matte-lipstick-35g_R04575962/
      → 1 variants re-pointed to KEEP

### Gucci — Rouge à Lèvres Satin Lipstick 3.5g  (2×)  ⚠️ price conflict

prices in group: $61.00, $64.00
→ price normalised to **$64.00** (highest in group)

KEEP  `416b498b-b95b-45e1-9f9c-faa96a479e26`  $61.00 / $38.00  locked=false  variants=23  stock=0  scraped=2026-06-22
      reason: owns 23 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-satin-lipstick-35g_R00191711/
DROP  `2b599943-242e-4375-9598-ee24c85881bc`  $64.00 / $40.00  locked=false  variants=6  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/gucci-rouge-a-levres-satin-lipstick-35g_R04304516/
      → 6 variants re-pointed to KEEP

### Hello Klean — Shower Head 2.0  (2×)

KEEP  `005cbcbc-78bc-4a92-a836-8a12d1d28f6d`  $120.00 / $75.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/hello-klean-shower-head-20_R04388567/
DROP  `56d1877e-9f73-4df0-a767-1077a1121622`  $120.00 / $75.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/hello-klean-shower-head-20_R04388568/

### Hermes — Les Mains Hermès nail polish 15ml  (3×)  ⚠️ price conflict

prices in group: $75.00, $75.00, $77.00
→ price normalised to **$77.00** (highest in group)

KEEP  `748bbf64-3777-4333-ae85-eee14f4b4fdd`  $75.00 / $47.00  locked=false  variants=24  stock=0  scraped=2026-07-01
      reason: owns 24 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/hermes-les-mains-hermes-nail-polish-15ml_R03834771/
DROP  `99d9f23b-2df1-4c1a-b0fe-2e4f743baecc`  $75.00 / $47.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hermes-les-mains-hermes-nail-polish-15ml_R04621806/
      → 3 variants re-pointed to KEEP
DROP  `33f4c6a4-2e87-4a5b-b2e6-3a4e0637af55`  $77.00 / $48.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hermes-les-mains-hermes-nail-polish-15ml_R04496748/
      → 1 variants re-pointed to KEEP

### Hourglass — Ambient Lighting Blush 4.2g  (2×)

KEEP  `2c384d1c-4c56-4376-841c-5a3880e48d62`  $74.00 / $46.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/hourglass-ambient-lighting-blush-42g_1112-3005965-CBLM254/
DROP  `0fbe7b83-fbba-4075-ae19-61a1f8d50fed`  $74.00 / $46.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hourglass-ambient-lighting-blush-42g_R03653098/
      → 1 variants re-pointed to KEEP

### Hourglass — Phantom Volumizing Glossy lip balm 1.7g  (4×)

KEEP  `a278e521-c890-4e9f-81c6-9f85acf9d592`  $61.00 / $36.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/hourglass-phantom-volumizing-glossy-lip-balm-17g_R03937559/
DROP  `d273a8c4-ffe1-4baa-a7e4-3404098c89bf`  $61.00 / $36.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hourglass-phantom-volumizing-glossy-lip-balm-17g_R04186765/
      → 4 variants re-pointed to KEEP
DROP  `7104c2ea-764d-4d33-b13b-70b3f163774b`  $61.00 / $36.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hourglass-phantom-volumizing-glossy-lip-balm-17g_R04429581/
      → 4 variants re-pointed to KEEP
DROP  `64da17b8-9473-4b72-a1c8-022eccc43dfa`  $61.00 / $36.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/hourglass-phantom-volumizing-glossy-lip-balm-17g_R04270276/
      → 4 variants re-pointed to KEEP

### Huda Beauty — Blush Filter 4.5ml  (3×)

KEEP  `f18171fb-010f-4ab8-90f3-6313d96b29a8`  $39.00 / $24.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-blush-filter-45ml_R04332275/
DROP  `2c165a37-c44f-4a53-8306-d4152e20a374`  $39.00 / $24.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-blush-filter-45ml_R04332275-S/
      → 4 variants re-pointed to KEEP
DROP  `325dee16-b51f-4146-a4d2-40bde56ce68e`  $39.00 / $24.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-blush-filter-45ml_R04623548/
      → 2 variants re-pointed to KEEP

### Huda Beauty — Blush Filter Palette 7.5g  (2×)

KEEP  `adade365-aae1-485b-b2a5-8f26de98f4d3`  $58.00 / $46.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-blush-filter-palette-75g_R04553743/
DROP  `68c14bba-502d-4998-bd89-011c2602c63b`  $58.00 / $46.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-blush-filter-palette-75g_R04623547/
      → 1 variants re-pointed to KEEP

### Huda Beauty — Diffusing Cheek Brush  (2×)

KEEP  `a225a323-e05c-4103-aab0-f6de9b99f4e7`  $33.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-08
      reason: richest row (has image)
      url: https://hudabeauty.com/en-qa/products/diffusing-cheek-brush-hb01649?variant=50750933401878
DROP  `9cbf2e31-3c16-404d-8fce-2dd8189a54cf`  $33.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-diffusing-cheek-brush_R04553744/

### Huda Beauty — Easy Bake Loose Powder 20g  (2×)

KEEP  `3e1575ba-8e3f-44ed-b794-42445a002d53`  $55.00 / $34.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-easy-bake-loose-powder-20g_R04611256/
DROP  `71ef1033-5344-4f09-98b2-5513584eb5be`  $55.00 / $34.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-easy-bake-loose-powder-20g_R04262960/
      → 1 variants re-pointed to KEEP

### Huda Beauty — Easy Blur natural airbrush foundation 30ml  (2×)

KEEP  `c5e3da92-5ae4-4425-805e-b0a3abb7b099`  $52.00 / $32.00  locked=false  variants=28  stock=0  scraped=2026-07-01
      reason: owns 28 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-easy-blur-natural-airbrush-foundation-30ml_R04368418/
DROP  `00831fe6-0524-4e9d-b5ff-de54395cc6eb`  $52.00 / $32.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-easy-blur-natural-airbrush-foundation-30ml_R04509598/
      → 8 variants re-pointed to KEEP

### Huda Beauty — Faux Filler Lip Gloss 3.9ml  (2×)

KEEP  `f95baa7a-10de-4941-817f-25cf12404727`  $35.00 / $19.00  locked=true  variants=3  stock=0  scraped=2026-07-01
      reason: price_locked (curated price)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-faux-filler-lip-gloss-39ml_R04623549/
DROP  `da99268b-7c02-4ea4-a7f8-04525980c77c`  $35.00 / $19.00  locked=true  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/huda-beauty-faux-filler-lip-gloss-39ml_R04423255/
      → 1 variants re-pointed to KEEP

### Huda Beauty — Mini NUDE Obsession eyeshadow palette 10g  (2×)

KEEP  `12a3840f-62ac-44f7-9812-5dfb9bb3b7a1`  $47.00 / $29.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/huda-beauty-mini-nude-obsession-eyeshadow-palette-10g_1036-3005459-HB00323/
DROP  `7812e333-087c-4f3f-a2ba-8a1a15e2a0bd`  $47.00 / $29.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-mini-nude-obsession-eyeshadow-palette-10g_1036-3005459-HB00324/
      → 1 variants re-pointed to KEEP

### Huda Beauty — Undereye Buff Brush  (2×)

KEEP  `d22d69a1-43e5-4c28-8800-cf9f0bd0b76a`  $33.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-08
      reason: richest row (has image)
      url: https://hudabeauty.com/en-qa/products/undereye-buff-brush-hb01658?variant=50573547471126
DROP  `332065f3-7e6e-44b2-bb75-fe2dd39210e9`  $33.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/huda-beauty-undereye-buff-brush_R04537840/

### Inuwet — Strawberry water-based nail polish 5ml  (2×)

KEEP  `7ff2140c-0b74-4df9-99ce-e6ca0f0ff5ad`  $14.00 / $7.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/inuwet-strawberry-water-based-nail-polish-5ml_R04367907/
DROP  `8fb10a72-2bc6-40f5-b4dd-f316191e4371`  $14.00 / $7.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/inuwet-strawberry-water-based-nail-polish-5ml_R04367903/
      → 1 variants re-pointed to KEEP

### It Cosmetics — Brow Power Universal eyebrow pencil 0.16g  (2×)

KEEP  `330e6682-ae1b-4520-af8a-8bfc93b4cfb1`  $42.00 / $25.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/it-cosmetics-brow-power-universal-eyebrow-pencil-016g_R03671168/
DROP  `b3ae1b7c-1578-4d35-bbd1-08db4fe3bbba`  $42.00 / $25.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/it-cosmetics-brow-power-universal-eyebrow-pencil-016g_R03671169/
      → 1 variants re-pointed to KEEP

### Jellycat — Bashful Bunny medium soft toy 31cm  (2×)

KEEP  `31e2e153-a5a9-422d-8d14-eb95c46b5eac`  $42.00 / $25.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/jellycat-bashful-bunny-medium-soft-toy-31cm_465-85424404-BAS3BC/
DROP  `8e1032f2-ab3c-41b6-904d-4bfd646b237c`  $42.00 / $25.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/jellycat-bashful-bunny-medium-soft-toy-31cm_465-85424404-BAS3BS/

### Jo Malone London — Myrrh & Tonka Cologne Intense 100ml  (2×)

KEEP  `1fdf9114-13af-4a74-a128-d2647b4b5b2f`  $286.00 / $164.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, bestseller)
      url: https://www.selfridges.com/GB/en/product/jo-malone-london-myrrh-tonka-cologne-intense-100ml_R04110480/
DROP  `adb6f28e-7632-422b-973f-ff8782513886`  $286.00 / $164.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/jo-malone-london-myrrh-tonka-cologne-intense-100ml_R04578550/

### Kylie By Kylie Jenner — Kylash Volume Mascara 12ml  (2×)

KEEP  `95a86971-3c90-4c03-9c8e-bd5c4ba9a927`  $41.00 / $24.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-kylash-volume-mascara-12ml_R04509861/
DROP  `f03e7d5c-ab59-4856-8ffa-ad0cb54df76f`  $41.00 / $24.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-kylash-volume-mascara-12ml_R04147268/

### Kylie By Kylie Jenner — Lip oil 6ml  (2×)

KEEP  `de563390-1b6a-4237-be10-8b6020036376`  $41.00 / $24.00  locked=false  variants=4  stock=0  scraped=2026-06-24
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-lip-oil-6ml_R04214694/
DROP  `01a58a05-8cc2-4627-be38-ac1f0a8a6c5a`  $41.00 / $24.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-lip-oil-6ml_R03768416/

### Kylie By Kylie Jenner — Plumping Powder Matte Lip 3ml  (5×)

KEEP  `381f4a72-be84-42e5-8e72-bcba57ad3285`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-plumping-powder-matte-lip-3ml_R04390978/
DROP  `d7775798-1b67-4b62-aa1e-859f96afe891`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-plumping-powder-matte-lip-3ml_R04390980/
      → 1 variants re-pointed to KEEP
DROP  `c7b0a88a-b821-44bc-9a8e-6ee61a502e04`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-plumping-powder-matte-lip-3ml_R04390975/
      → 1 variants re-pointed to KEEP
DROP  `f8d3ada2-ff87-4184-a34f-0f0fb07ad000`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-plumping-powder-matte-lip-3ml_R04390972/
      → 1 variants re-pointed to KEEP
DROP  `9b8e7bfd-a7e0-413a-9bc7-94b6a88a7e6d`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-plumping-powder-matte-lip-3ml_R04390976/
      → 1 variants re-pointed to KEEP

### Kylie By Kylie Jenner — Tinted Butter Balm 2.4g  (4×)

KEEP  `7228de01-3bb7-45c5-afbe-6dd08ae106a1`  $36.00 / $18.00  locked=false  variants=6  stock=0  scraped=2026-06-24
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-tinted-butter-balm-24g_R04192103/
DROP  `cc43db48-d05c-4539-831d-b73c67ddeef6`  $36.00 / $18.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-tinted-butter-balm-24g_R04471870/
      → 1 variants re-pointed to KEEP
DROP  `88c0daf6-b52b-470b-9cdc-8bc9ecbb4723`  $36.00 / $18.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-tinted-butter-balm-24g_R04471869/
      → 1 variants re-pointed to KEEP
DROP  `277772c1-5a22-4777-9c19-af0d701dfdab`  $36.00 / $18.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/kylie-by-kylie-jenner-tinted-butter-balm-24g_R04471871/
      → 1 variants re-pointed to KEEP

### La Bonne Brosse — N.01 The Universal Small Shine & Care hair brush  (2×)

KEEP  `a7457eb8-ad1a-4322-b620-a4cce99a4079`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-small-shine-care-hair-brush_R04392533/
DROP  `0cdb2525-3488-4b03-b4e3-8f9bad99c451`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-small-shine-care-hair-brush_R04392541/

### La Bonne Brosse — N.01 The Universal The Shine & Care hair brush  (5×)

KEEP  `7f1f59f7-7384-4f04-8578-de646d884799`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-the-shine-care-hair-brush_R04392515/
DROP  `f4a7eaa9-f9dc-4445-9b93-359be911f6bd`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-the-shine-care-hair-brush_R04392521/
DROP  `1c43ffb7-09cf-4238-8da0-ca6ead391bea`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-the-shine-care-hair-brush_R04645442/
DROP  `3276b04b-e56a-4e67-a453-1b66bc0ab918`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-the-shine-care-hair-brush_R04392529/
DROP  `7dd53601-db01-41b6-8295-52961ec66991`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n01-the-universal-the-shine-care-hair-brush_R04392537/

### La Bonne Brosse — N.02 The Essential Care & Detangling hair brush  (4×)

KEEP  `1059e345-1bce-459a-a3b0-d93a5332f7bf`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-care-detangling-hair-brush_R04392525/
DROP  `23344390-4188-4cdd-a9e0-827886a223e4`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-23
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-care-detangling-hair-brush_R04392543/
DROP  `70d3c57a-0b4e-4d57-998b-d34adc1d4a37`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-care-detangling-hair-brush_R04392517/
DROP  `1484b42b-9871-4d4c-b209-d3a5a72d86f3`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-care-detangling-hair-brush_R04392539/

### La Bonne Brosse — N.02 The Essential Small Care & Detangling hair brush  (3×)

KEEP  `0e13ae2f-a495-47e5-9039-a8baeaec6a84`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-small-care-detangling-hair-brush_R04392535/
DROP  `9a89556c-ac06-4155-a701-92243e285d6b`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-small-care-detangling-hair-brush_R04645448/
DROP  `23c8a812-a0fd-4df0-9a95-cc6dc91e5a42`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n02-the-essential-small-care-detangling-hair-brush_R04392531/

### La Bonne Brosse — N.03 The Essential Small Softness Gentle Scalp Care hair brush  (2×)

KEEP  `baafe9e2-b23e-4539-9ef6-336fbaf92cad`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-small-softness-gentle-scalp-care-hair-brush_R04392544/
DROP  `463ff9be-694a-43e3-a6d5-b17f491b2280`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-small-softness-gentle-scalp-care-hair-brush_R04392542/

### La Bonne Brosse — N.03 The Essential Softness Gentle Scalp Care hair brush  (4×)

KEEP  `b3723479-36f5-46a2-8549-358d5ae842ee`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-softness-gentle-scalp-care-hair-brush_R04392523/
DROP  `9eeded5e-96b6-45df-b7e3-be0ca96e3730`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-softness-gentle-scalp-care-hair-brush_R04392545/
DROP  `65408796-d289-40db-b01c-2ee2684748a2`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-softness-gentle-scalp-care-hair-brush_R04392527/
DROP  `09c7b5fa-fbcb-4c2a-a9dd-71abf8b02d4f`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n03-the-essential-softness-gentle-scalp-care-hair-brush_R04392519/

### La Bonne Brosse — N.04 The Miracle Massaging Detangling hair brush  (4×)

KEEP  `ce6bd041-b26c-4831-b17c-94e9646f0c7c`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-massaging-detangling-hair-brush_R04392540/
DROP  `c6e3254b-ba74-476e-bdff-c9876b93fdb6`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-massaging-detangling-hair-brush_R04392536/
DROP  `08e37aeb-192e-4220-b9a5-dd42f9200689`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-massaging-detangling-hair-brush_R04392538/
DROP  `3fdfd8b1-e79b-42f7-b53c-5b5c8573b85d`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-massaging-detangling-hair-brush_R04392534/

### La Bonne Brosse — N.04 The Miracle Small Massaging Detangling hair brush  (2×)

KEEP  `3c462cee-ffd8-4f67-841a-28326a5e8c36`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-small-massaging-detangling-hair-brush_R04392530/
DROP  `131d5f81-8ddd-422e-bfd1-7d605569176a`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n04-the-miracle-small-massaging-detangling-hair-brush_R04392532/

### La Bonne Brosse — N.07 The Intense Small Stimulating & Detangling hair brush  (2×)

KEEP  `83358a96-6a3c-4bac-96c5-cc1a6f0c0684`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-small-stimulating-detangling-hair-brush_R04392516/
DROP  `fd761fe7-7ee6-40f1-8bff-855c48873c47`  $157.00 / $98.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-small-stimulating-detangling-hair-brush_R04392514/

### La Bonne Brosse — N.07 The Intense Stimulating & Detangling hair brush  (4×)

KEEP  `c992ba7c-490e-4d5d-a480-c10f4d0f2809`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-stimulating-detangling-hair-brush_R04392522/
DROP  `cfa3360c-0e27-47f2-a914-127b762361a5`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-stimulating-detangling-hair-brush_R04392520/
DROP  `311e9673-f4ae-4b0f-a95e-fd3569feccc6`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-stimulating-detangling-hair-brush_R04392524/
DROP  `0cba9a5d-0e76-48e7-8a09-88f8aa160813`  $233.00 / $146.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-n07-the-intense-stimulating-detangling-hair-brush_R04392518/

### La Bonne Brosse — The Large Detangling Comb  (2×)

KEEP  `54e763ad-bd98-4d96-b965-cbe45fe09aa2`  $61.00 / $38.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-the-large-detangling-comb_R04577249/
DROP  `c3f0ebe8-3a1e-443d-8f1a-8274c36200e8`  $61.00 / $38.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/la-bonne-brosse-the-large-detangling-comb_R04577250/

### Lancome — Blush Subtil 6g  (2×)

KEEP  `f6bed1fd-e18f-442e-9290-e4dc015d0062`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lancome-blush-subtil-6g_R04284446/
DROP  `d05fa293-3d71-4f93-847b-7b7bd0f52ce0`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/lancome-blush-subtil-6g_R04284445/
      → 1 variants re-pointed to KEEP

### Lancome — Idôle Ultra Precise waterproof eyeliner 1ml  (2×)

KEEP  `84cf2f6c-aeb1-4264-a105-d252e9f2234a`  $42.00 / $25.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/lancome-idole-ultra-precise-waterproof-eyeliner-1ml_R03902896/
DROP  `c26e7216-7061-4b03-861b-5768e6a2164e`  $42.00 / $25.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/lancome-idole-ultra-precise-waterproof-eyeliner-1ml_R04370365/

### Lancome — Le Stylo Waterproof eyeliner 0.28g  (2×)

KEEP  `65a614bd-6de5-4d24-804f-08ea4ab32c68`  $44.00 / $26.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lancome-le-stylo-waterproof-eyeliner-028g_R03797017/
DROP  `d0d29cb5-eff4-455a-a71e-9f8e860b263d`  $44.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lancome-le-stylo-waterproof-eyeliner-028g_R04319364/

### Lancome — Rénergie H.P.N 300 Peptide cream 50ml  (2×)

KEEP  `b19cb12c-6aa7-4847-99de-b671ce92bd3d`  $142.00 / $89.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/lancome-renergie-hpn-300-peptide-cream-50ml_R04144168/
DROP  `2bbee8b6-09b9-4394-8a6c-e708eacee8a0`  $142.00 / $89.00  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/lancome-renergie-hpn-300-peptide-cream-50ml_R04221581/

### Laneige — Glaze Craze Tinted Lip Serum 12g  (4×)

KEEP  `84185a84-97fb-45b8-9a41-397529dfc7d8`  $38.00 / $19.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/laneige-glaze-craze-tinted-lip-serum-12g_R04461751/
DROP  `87cc198f-0727-4b5e-b218-308fcd6f695e`  $38.00 / $19.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/laneige-glaze-craze-tinted-lip-serum-12g_R04646810/
      → 3 variants re-pointed to KEEP
DROP  `b4527aca-af3b-4805-aeb4-990743f65537`  $38.00 / $19.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/laneige-glaze-craze-tinted-lip-serum-12g_R04472107/
DROP  `170a1dc3-83ea-412f-9d06-79f90bc813d9`  $38.00 / $19.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/laneige-glaze-craze-tinted-lip-serum-12g_R04472106/

### Laura Mercier — Bronze Colour Infusion 9g  (3×)

KEEP  `a26e3f47-b99d-4c32-aeae-abf2a144d29f`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/laura-mercier-bronze-colour-infusion-9g_R04471287/
DROP  `12f4ac15-3845-4895-b1fd-4cd331df6274`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/laura-mercier-bronze-colour-infusion-9g_R04471283/
DROP  `7f08d5f5-163e-486a-b72d-6156f374dcfd`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/laura-mercier-bronze-colour-infusion-9g_R04471284/

### Laura Mercier — Tinted Moisturiser Blurred Matte SPF30 40ml  (3×)

KEEP  `6cb6f519-d6d6-4dcb-ba1f-e2f40708c6bb`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/laura-mercier-tinted-moisturiser-blurred-matte-spf30-40ml_R04472850/
DROP  `1fa8e0a2-bea3-45f3-9089-6a9edd201b8a`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/laura-mercier-tinted-moisturiser-blurred-matte-spf30-40ml_R04472845/
      → 1 variants re-pointed to KEEP
DROP  `06d8a7f0-d91e-4adf-93a3-91d6d8638697`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-06-23
      url: https://www.selfridges.com/GB/en/product/laura-mercier-tinted-moisturiser-blurred-matte-spf30-40ml_R04472847/
      → 1 variants re-pointed to KEEP

### Laura Mercier — Translucent loose setting powder 29g  (2×)

KEEP  `2ed33f83-e770-4994-869a-fd63a5369a32`  $62.00 / $38.50  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/laura-mercier-translucent-loose-setting-powder-29g_304-3001489-12321001/
DROP  `e9913424-bf08-4bcd-9394-94738599c8ab`  $62.00 / $38.50  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/laura-mercier-translucent-loose-setting-powder-29g_R03663470/
      → 1 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Eyeshadow Palette 5.7g  (2×)

KEEP  `4e3081a5-4ede-4f3b-8700-6b1e3e0e5e0c`  $80.00 / $50.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-eyeshadow-palette-57g_R04179774/
DROP  `fabf5fed-3e93-4338-ae72-68d6c07f5842`  $80.00 / $50.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-eyeshadow-palette-57g_R04382517/
      → 1 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Kitten Lash mascara 8ml  (2×)

KEEP  `7386dd33-08f6-490e-bced-902951770233`  $49.00 / $29.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-kitten-lash-mascara-8ml_R04287739/
DROP  `f35bf9f2-37fa-411e-b9f0-1f9982298089`  $49.00 / $29.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-kitten-lash-mascara-8ml_R04456908/
      → 1 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Liquid Lurex eyeshadow 2.8ml  (2×)

KEEP  `08a78b05-6cc4-4e97-b816-4a081d2d4af9`  $39.00 / $21.00  locked=false  variants=9  stock=0  scraped=2026-07-01
      reason: owns 9 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-liquid-lurex-eyeshadow-28ml_R04179773/
DROP  `8b6c6181-20f2-4f8a-9a74-9b2a838318d1`  $39.00 / $21.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-liquid-lurex-eyeshadow-28ml_R04559687/
      → 3 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Rouge Experience lipstick refill 3.5g  (2×)

KEEP  `3f1c5aed-51b2-437f-bc9f-7773a1fc5b6f`  $42.00 / $25.00  locked=false  variants=13  stock=0  scraped=2026-07-01
      reason: owns 13 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-rouge-experience-lipstick-refill-35g_R04237031/
DROP  `f00171c9-c376-4462-b2a1-e356e56a7ffb`  $42.00 / $25.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-rouge-experience-lipstick-refill-35g_R04658692/
      → 2 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Rouge Experience refillable lipstick 3.5g  (2×)

KEEP  `b06c8cbd-e635-4e8f-8cad-5e4567a4b065`  $79.00 / $49.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-rouge-experience-refillable-lipstick-35g_R04406670/
DROP  `2e20052a-309f-4998-9d0d-704f5cabc46d`  $79.00 / $49.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-rouge-experience-refillable-lipstick-35g_R04658691/
      → 2 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Seamless Glide eye pencil 1.2g  (2×)

KEEP  `2eb41fb7-9e6c-4c84-b87e-e912545357a5`  $42.00 / $25.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-seamless-glide-eye-pencil-12g_R04220891/
DROP  `df7d9afa-9f3f-408c-882d-e3edf76365e0`  $42.00 / $25.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-seamless-glide-eye-pencil-12g_R04634822/
      → 3 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Seamless Skin Enhancing Tint 30ml  (2×)

KEEP  `13e8477e-1b3d-41de-933e-283c01b9755f`  $63.00 / $39.00  locked=false  variants=19  stock=0  scraped=2026-07-01
      reason: owns 19 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-seamless-skin-enhancing-tint-30ml_R04306405/
DROP  `6cb0fe9e-4883-4816-8b69-d01e31d03625`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-seamless-skin-enhancing-tint-30ml_R04440759/
      → 1 variants re-pointed to KEEP

### Lisa Eldridge Beauty — Velveteen Liquid Lip Colour 3ml  (2×)

KEEP  `214f6c64-fac4-4101-84ed-415c8bfd203a`  $39.00 / $21.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-velveteen-liquid-lip-colour-3ml_R04205286/
DROP  `4d4be103-f292-4d32-a01b-b37d5aeb5898`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/lisa-eldridge-beauty-velveteen-liquid-lip-colour-3ml_R04658693/
      → 1 variants re-pointed to KEEP

### Mac — Dazzleshadow 1.5g  (2×)

KEEP  `9a9b5ff0-3ec5-40b1-9181-378464efe662`  $40.00 / $22.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/mac-dazzleshadow-15g_329-81004873-MWNE280000/
DROP  `97e99c44-b0ee-4fdb-a769-f7c1e897e7a2`  $40.00 / $22.00  locked=false  variants=0  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/mac-dazzleshadow-15g_R00114182/

### Mac — Lip pencil 1.45g  (3×)  ⚠️ price conflict

prices in group: $36.00, $40.00, $40.00
→ price normalised to **$40.00** (highest in group)

KEEP  `72486f36-71b1-4137-bcde-bbf10d8d974c`  $36.00 / $18.00  locked=false  variants=26  stock=0  scraped=2026-07-01
      reason: owns 26 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/mac-lip-pencil-145g_329-81004873-LIPPENCIL/
DROP  `4d7d234d-875d-45c6-866b-635d118a5c11`  $40.00 / $20.00  locked=false  variants=10  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/mac-lip-pencil-145g_R04375190/
      → 10 variants re-pointed to KEEP
DROP  `83e5688a-20f7-4e7e-8c47-3396eee34f2b`  $40.00 / $20.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/mac-lip-pencil-145g_R04587715/
      → 3 variants re-pointed to KEEP

### Mac — Small Eye Shadow 1.5g  (2×)

KEEP  `b7f68b08-44c0-4a92-bc30-b689cd36368f`  $40.00 / $20.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/mac-small-eye-shadow-15g_R04159681/
DROP  `1e554642-a404-4da9-b83b-573185001df0`  $40.00 / $20.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/mac-small-eye-shadow-15g_R04159680/
      → 1 variants re-pointed to KEEP

### Mac — Studio Fix 36hr Smooth Angles Concealer 7ml  (2×)

KEEP  `f42a5c56-688e-4ec3-a537-4f5fb99e62a1`  $42.00 / $25.00  locked=false  variants=25  stock=0  scraped=2026-07-01
      reason: owns 25 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/mac-studio-fix-36hr-smooth-angles-concealer-7ml_R04609427/
DROP  `f479ff7a-e03a-4841-bed0-c730d7afd988`  $42.00 / $25.00  locked=false  variants=19  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/mac-studio-fix-36hr-smooth-angles-concealer-7ml_R04609426/
      → 19 variants re-pointed to KEEP

### Mac — Studio Fix Fluid SPF 15 foundation 30ml  (2×)

KEEP  `90196994-baa1-495f-a89d-481a2dd1713c`  $57.00 / $34.00  locked=false  variants=71  stock=0  scraped=2026-07-01
      reason: owns 71 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/mac-studio-fix-fluid-spf-15-foundation-30ml_R04317519/
DROP  `690cebc5-be8d-4367-86d3-53859940a7fc`  $57.00 / $34.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/mac-studio-fix-fluid-spf-15-foundation-30ml_R04608942/
      → 5 variants re-pointed to KEEP

### Manucurist — Green Flash nail polish 15ml  (2×)

KEEP  `53c52755-a62b-4833-a9c9-17ef20f66373`  $38.00 / $19.00  locked=false  variants=14  stock=0  scraped=2026-07-01
      reason: owns 14 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/manucurist-green-flash-nail-polish-15ml_R04199894/
DROP  `e2f6b588-b215-4314-a454-3e714c2fcf6b`  $38.00 / $19.00  locked=false  variants=12  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/manucurist-green-flash-nail-polish-15ml_R04199894-S/
      → 12 variants re-pointed to KEEP

### Morphe — Forbidden Lust Potion Lip Oil 3.2ml  (2×)

KEEP  `b1f99f18-0167-4467-af8f-fa6f4c5ab749`  $26.00 / $12.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/morphe-forbidden-lust-potion-lip-oil-32ml_R04449656/
DROP  `4a3e27b2-586a-4a64-b74d-db78aa7e8e22`  $26.00 / $12.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/morphe-forbidden-lust-potion-lip-oil-32ml_R04449651/
      → 1 variants re-pointed to KEEP

### Morphe — Wakeup Artist Under Eye Complexion Concealer 3.78ml  (2×)

KEEP  `b7066f36-1103-4301-b305-df0a9cd2bcea`  $26.00 / $12.00  locked=false  variants=20  stock=0  scraped=2026-07-01
      reason: owns 20 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/morphe-wakeup-artist-under-eye-complexion-concealer-378ml_R04448004/
DROP  `ddd5171f-120b-4650-aaa7-cb72cc1ffa9b`  $26.00 / $12.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/morphe-wakeup-artist-under-eye-complexion-concealer-378ml_R04447990/
      → 4 variants re-pointed to KEEP

### Nars — Afterglow lip balm 3g  (2×)

KEEP  `f8724360-e178-45b6-8893-e60d000538df`  $48.00 / $28.50  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-lip-balm-3g_R04179781/
DROP  `19317962-d9db-4598-8520-0b7fb78db905`  $48.00 / $28.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-lip-balm-3g_R04600220/

### Nars — Afterglow Lip Shine 5.5ml  (2×)  ⚠️ price conflict

prices in group: $56.00, $46.00
→ price stays **$56.00** (already the highest)

KEEP  `1ce5020c-7ad7-42bf-bb3e-e714394c0786`  $56.00 / $33.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-lip-shine-55ml_R04668050/
DROP  `77a42657-c6f8-4f2f-a0ec-c462b10605e4`  $46.00 / $27.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-lip-shine-55ml_R04506643/

### Nars — Afterglow Sensual Shine Lipstick 1.5g  (3×)

KEEP  `3b3d746b-6497-4b37-ada4-905b88d6c0b5`  $50.00 / $29.50  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-sensual-shine-lipstick-15g_R04600222/
DROP  `3bf5cafc-d3b9-48b6-bcff-8a4614a28b38`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-sensual-shine-lipstick-15g_R04199226/
DROP  `d5f728ad-2097-464b-9675-d9c34519b8c8`  $50.00 / $29.50  locked=false  variants=0  stock=0  scraped=2026-06-23
      url: https://www.selfridges.com/GB/en/product/nars-afterglow-sensual-shine-lipstick-15g_R04199226-S/

### Nars — Blush 4.8g  (2×)

KEEP  `0a5dd6ea-0cd3-4496-8b5c-9f0c54d2a8b9`  $60.00 / $35.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nars-blush-48g_R04600221/
DROP  `7118b95a-2133-4639-b351-599fb37612ec`  $60.00 / $35.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-blush-48g_R04338014/

### Nars — Explicit lipstick 3.8g  (3×)  ⚠️ price conflict

prices in group: $59.00, $57.00, $59.00
→ price stays **$59.00** (already the highest)

KEEP  `7a9b4213-18d6-44d9-bbfd-8ebf2fc20ec3`  $59.00 / $35.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nars-explicit-lipstick-38g_R04373617/
DROP  `ecb2fbd7-a200-4413-89cd-39f1ca4485e2`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-explicit-lipstick-38g_R04451437/
DROP  `de7da237-fe0f-467e-8148-b7ee4e5184ee`  $59.00 / $35.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/nars-explicit-lipstick-38g_R04509497/

### Nars — Light Reflecting Foundation 30ml  (2×)

KEEP  `8b804a21-54cb-4c21-8bac-d48fcc18ac58`  $70.00 / $43.50  locked=false  variants=32  stock=0  scraped=2026-07-01
      reason: owns 32 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-light-reflecting-foundation-30ml_R03918304/
DROP  `96186d0d-7af3-43b4-941d-f76ee80e5b70`  $70.00 / $43.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-light-reflecting-foundation-30ml_R04443147/

### Nars — Powermatte Lipstick 1.5g  (2×)  ⚠️ price conflict

prices in group: $45.00, $53.00
→ price normalised to **$53.00** (highest in group)

KEEP  `4edf74e4-054a-4ebf-b760-49723f463176`  $45.00 / $26.50  locked=false  variants=2  stock=0  scraped=2026-07-01
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-powermatte-lipstick-15g_R04225674/
DROP  `c3b448db-0c3b-4a11-b678-bd54df27315b`  $53.00 / $31.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-powermatte-lipstick-15g_R04057054/

### Nars — Sheer Glow Foundation 30ml  (2×)

KEEP  `3f329e4a-0160-4d71-a728-520885b2d978`  $66.00 / $41.00  locked=false  variants=14  stock=0  scraped=2026-07-01
      reason: owns 14 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-sheer-glow-foundation-30ml_318-2000192-SHEERGLOWFOUND/
DROP  `84f37b9d-fb63-490c-aa9e-8fb979a53bd6`  $66.00 / $41.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-sheer-glow-foundation-30ml_318-3005982-34104850101/

### Nars — Total Seduction eyeshadow stick 1.6g  (2×)

KEEP  `fd1c236e-00ac-455c-8134-d9680ed46b5b`  $49.00 / $29.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nars-total-seduction-eyeshadow-stick-16g_R04343970/
DROP  `82553676-1ac2-440e-9109-2f25a9ab1478`  $49.00 / $29.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nars-total-seduction-eyeshadow-stick-16g_R04497363/

### Norway Omega — Norwegian Omega-3 finest marine oil 120 capsules  (2×)

KEEP  `8b3934a6-122e-443d-85be-00d6eece7d10`  $96.00 / $59.99  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/norway-omega-norwegian-omega-3-finest-marine-oil-120-capsules_R04253239/
DROP  `a363687d-8f25-4445-9496-891e3c5cef89`  $96.00 / $59.99  locked=false  variants=0  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/norway-omega-norwegian-omega-3-finest-marine-oil-120-capsules_R04253240/

### Nudestix — Citrus Fruit & Glycolic Glow toner 95ml  (2×)  ⚠️ price conflict

prices in group: $41.00, $52.00
→ price normalised to **$52.00** (highest in group)

KEEP  `fdf39217-c660-4cb1-a992-451642e45749`  $41.00 / $24.50  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nudestix-citrus-fruit-glycolic-glow-toner-95ml_R03717329/
DROP  `db0bf6c4-b677-4831-a5a1-b18c6c8f23fa`  $52.00 / $31.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nudestix-citrus-fruit-glycolic-glow-toner-95ml_R03717330/

### Nudestix — Eyebrow Stylus Pencil and Gel 2g/2.5ml  (2×)  ⚠️ price conflict

prices in group: $39.00, $40.00
→ price normalised to **$40.00** (highest in group)

KEEP  `201b2cf3-97c8-43a2-992e-a15441f2b7f2`  $39.00 / $21.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nudestix-eyebrow-stylus-pencil-and-gel-2g25ml_277-3006705-108006/
DROP  `b14e8bdf-ce53-4b29-acc2-ceb9c661781a`  $40.00 / $20.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/nudestix-eyebrow-stylus-pencil-and-gel-2g25ml_277-3006705-108006-S/
      → 1 variants re-pointed to KEEP

### Nudestix — Intense Matte Lip + Cheek Pencil 1.41g  (2×)

KEEP  `27a5791a-0314-4a47-bedb-19594c2c891f`  $40.00 / $22.00  locked=false  variants=11  stock=0  scraped=2026-07-01
      reason: owns 11 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nudestix-intense-matte-lip-cheek-pencil-141g_277-3006705-101006/
DROP  `38c88efa-f149-4990-a7ec-c8b72c2f4b32`  $40.00 / $22.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nudestix-intense-matte-lip-cheek-pencil-141g_R04154111/
      → 5 variants re-pointed to KEEP

### Nudestix — Mini Metallic Eye Kit  (2×)

KEEP  `b94e5cc1-9c9a-4239-a828-f2d1e506a51a`  $49.00 / $29.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nudestix-mini-metallic-eye-kit_1118-3006705-839174001656/
DROP  `75d7183f-19aa-4df4-8b7f-8b350d11c2be`  $49.00 / $29.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nudestix-mini-metallic-eye-kit_277-3006705-100666/

### Nudestix — NudeScreen Daily Mineral Veil SPF30 50ml  (2×)

KEEP  `5b3179f1-5fa1-44bf-bd73-d18b80e8aa12`  $52.00 / $31.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/nudestix-nudescreen-daily-mineral-veil-spf30-50ml_R03946163/
DROP  `de79a16c-5da7-43a3-a37c-b9be6ef91a01`  $52.00 / $31.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nudestix-nudescreen-daily-mineral-veil-spf30-50ml_R04154112/

### Nudestix — NUDIES All-Over Matte Blush face colour 7g  (2×)

KEEP  `f61bb699-9f29-4f18-ae65-f52d009e8321`  $53.00 / $31.50  locked=false  variants=13  stock=0  scraped=2026-07-01
      reason: owns 13 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nudestix-nudies-all-over-matte-blush-face-colour-7g_277-3006705-100207/
DROP  `9e43f8d5-5c43-4c89-a197-839a023494a7`  $53.00 / $31.50  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/nudestix-nudies-all-over-matte-blush-face-colour-7g_R04154109/
      → 3 variants re-pointed to KEEP

### Nudestix — Tinted Cover Foundation 20ml  (2×)

KEEP  `5687c033-6bcc-4006-b56c-27a451a4dbf1`  $54.00 / $32.00  locked=false  variants=14  stock=0  scraped=2026-07-01
      reason: owns 14 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/nudestix-tinted-cover-foundation-20ml_277-3006705-4001816/
DROP  `f7eb9f33-917f-4aad-9c39-1e1db3f3610e`  $54.00 / $32.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/nudestix-tinted-cover-foundation-20ml_277-3006705-4001816-S/
      → 1 variants re-pointed to KEEP

### Ouai — Super-Dry Shampoo 56g  (2×)

KEEP  `318ac6b4-95d3-4dc2-9a4b-fa9c68f55658`  $28.00 / $14.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/ouai-super-dry-shampoo-56g_R04473154/
DROP  `c69eefff-30ff-490a-bbf7-6d2f0e39661f`  $28.00 / $14.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/ouai-super-dry-shampoo-56g_R04475738/

### Parfums De Marly — Refillable Travel Case 10ml  (2×)

KEEP  `7882af7a-b44f-4d55-a9ee-9374c15d8412`  $192.00 / $110.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/parfums-de-marly-refillable-travel-case-10ml_R04520780/
DROP  `6cf687f3-7a55-45de-a6b7-1bfeec2827fe`  $192.00 / $110.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/parfums-de-marly-refillable-travel-case-10ml_R04520781/

### Pat Mcgrath Labs — Divine Blush: Legendary Glow limited-edition colour balm 7g  (2×)

KEEP  `c64feb12-49ef-40dc-8e81-524a7f2e23e8`  $46.00 / $27.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/pat-mcgrath-labs-divine-blush-legendary-glow-limited-edition-colour-balm-7g_R04160108/
DROP  `db545ed8-a08e-4184-a12a-74e20af8f7d1`  $46.00 / $27.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/pat-mcgrath-labs-divine-blush-legendary-glow-limited-edition-colour-balm-7g_R04325207/
      → 4 variants re-pointed to KEEP

### Phlur — Coconut Skin Hair and Body Fragrance Mist 88ml  (2×)  ⚠️ price conflict

prices in group: $51.11, $75.55
→ price normalised to **$75.55** (highest in group)

KEEP  `48f5d9bd-bcef-4ec8-8c27-d3152e6924bb`  $51.11 / $28.89  locked=false  variants=0  stock=0  scraped=2026-07-16
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/phlur-coconut-skin-hair-and-body-fragrance-mist-88ml_R04506981/
DROP  `d9ae1dda-553e-4aaa-bd67-9b659f1332d6`  $75.55 / $43.33  locked=false  variants=0  stock=0  scraped=2026-07-16
      url: https://www.selfridges.com/GB/en/product/phlur-coconut-skin-hair-and-body-fragrance-mist-88ml_R04506982/

### Pixi — On-the-Glow Blush tinted moisture stick 19g  (2×)

KEEP  `3021ee73-6ae7-46e4-90bc-b493028b3af5`  $36.00 / $18.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/pixi-on-the-glow-blush-tinted-moisture-stick-19g_R04230158/
DROP  `e2de8a1f-8073-48a6-b604-efb162e5e7cf`  $36.00 / $18.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/pixi-on-the-glow-blush-tinted-moisture-stick-19g_R04304854/
      → 1 variants re-pointed to KEEP

### Prada — Dimensions Durable eyeshadow palette 6g  (3×)

KEEP  `c05fb7e9-72cc-42fc-81b7-cac0bab8e051`  $107.00 / $67.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/prada-dimensions-durable-eyeshadow-palette-6g_R04208597/
DROP  `38d1e736-64e0-4ef3-8c20-e726465d2067`  $107.00 / $67.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/prada-dimensions-durable-eyeshadow-palette-6g_R04208599/
      → 1 variants re-pointed to KEEP
DROP  `ec6c50bf-ef15-4fdc-a2b0-7161ba040849`  $107.00 / $67.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/prada-dimensions-durable-eyeshadow-palette-6g_R04208600/
      → 1 variants re-pointed to KEEP

### Prada — Prada Balm lip balm 3.8g  (2×)

KEEP  `f68b29f4-cb57-4da2-8884-b7930a8034ad`  $64.00 / $40.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/prada-prada-balm-lip-balm-38g_R04335620/
DROP  `a4998261-803f-4084-9989-19b667a70d78`  $64.00 / $40.00  locked=false  variants=0  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/prada-prada-balm-lip-balm-38g_R04207514/

### Refy — Brow Pomade 1.5g  (2×)

KEEP  `7dfc95aa-0d75-4bc1-acc2-feb354137672`  $32.00 / $16.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/refy-brow-pomade-15g_R04259992/
DROP  `5b417eef-1605-4daa-8f4d-48dd33b3e0bc`  $32.00 / $16.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/refy-brow-pomade-15g_R04509879/
      → 1 variants re-pointed to KEEP

### Refy — Lash Sculpt Mascara 10ml  (2×)

KEEP  `c63d2573-5b1c-475b-9775-93ecd67a4174`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/refy-lash-sculpt-mascara-10ml_R04518244/
DROP  `4c75183d-fe22-4b4f-9993-80f6aafaabbd`  $40.00 / $22.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/refy-lash-sculpt-mascara-10ml_R04287212/

### Sisley — Phyto-blush twist  (2×)

KEEP  `482485dd-8d40-426a-8331-5cb47919b686`  $101.00 / $63.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-blush-twist_466-3002705-187901/
DROP  `dad21ced-5e9c-47a2-9002-4cd15073a9b2`  $101.00 / $63.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-blush-twist_466-3002705-187903/

### Sisley — Phyto-Rouge Shine refillable lipstick 3g  (2×)

KEEP  `b2475795-94ca-418f-81fb-3eb99e2a6e71`  $77.00 / $48.00  locked=false  variants=1  stock=0  scraped=2026-06-27
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-rouge-shine-refillable-lipstick-3g_R04188088/
DROP  `093eb395-ac40-4467-8b21-411eff49b21c`  $77.00 / $48.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-rouge-shine-refillable-lipstick-3g_R03902522/

### Sisley — Phyto-Rouge Velvet Lipstick 3.4g  (3×)

KEEP  `87a4913f-9cc3-4f86-9f5f-40c191bb8347`  $80.00 / $50.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-rouge-velvet-lipstick-34g_R04455343/
DROP  `5b286db0-da8f-472d-aa77-cfe24384a312`  $80.00 / $50.00  locked=false  variants=1  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-rouge-velvet-lipstick-34g_R04455347/
      → 1 variants re-pointed to KEEP
DROP  `199580d2-6c32-4d78-9fe3-385bb95e3bfa`  $80.00 / $50.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/sisley-phyto-rouge-velvet-lipstick-34g_R04455350/

### Slip — Skinny Pack of Four Pure Silk Scrunchies  (2×)

KEEP  `e677bce7-eb50-4183-a504-d0381034b4e5`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-06-22
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/slip-skinny-pack-of-four-pure-silk-scrunchies_R04606918/
DROP  `8028181c-68c7-478c-bd75-2f5fe737ff4a`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-06-22
      url: https://www.selfridges.com/GB/en/product/slip-skinny-pack-of-four-pure-silk-scrunchies_R04606924/

### Slip — Skinny Silk Scrunchies Pack of Four  (4×)

KEEP  `36ba073f-7a33-4fbb-bba4-5b303672866e`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/slip-skinny-silk-scrunchies-pack-of-four_R04433863/
DROP  `ec1ac222-6c88-4400-870d-86af7a1032f4`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/slip-skinny-silk-scrunchies-pack-of-four_R04123154/
DROP  `b23c930d-f625-46be-8a6b-64264f9a78e6`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/slip-skinny-silk-scrunchies-pack-of-four_R04123159/
DROP  `ef06ed63-9e3f-4852-a6a8-5071db7f6453`  $62.00 / $37.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/slip-skinny-silk-scrunchies-pack-of-four_R04123153/

### Stila — Heaven's Dew Gel Lip Oil 5.35ml  (2×)

KEEP  `cb86527d-5072-4f68-a4b9-91813e615e71`  $40.00 / $22.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/stila-heavens-dew-gel-lip-oil-535ml_R04613597/
DROP  `4029eccb-c143-4942-96fa-70c58213f042`  $40.00 / $22.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/stila-heavens-dew-gel-lip-oil-535ml_R04275748/
      → 2 variants re-pointed to KEEP

### Suqqu — Blurring Colour blush 6.4g  (3×)

KEEP  `e34693f9-b350-47c7-88ef-1abea034b53b`  $64.00 / $40.00  locked=false  variants=7  stock=0  scraped=2026-07-01
      reason: owns 7 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-blurring-colour-blush-64g_R04359670/
DROP  `6e4a563a-8912-498e-a7ac-b0ba281ae98b`  $64.00 / $40.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-blurring-colour-blush-64g_R04508810/
      → 2 variants re-pointed to KEEP
DROP  `a82142d3-8be8-4641-9ae4-7a8c6838a056`  $64.00 / $40.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-blurring-colour-blush-64g_R04622974/
      → 2 variants re-pointed to KEEP

### Suqqu — Moisture Glaze lipstick refill 3.7g  (4×)

KEEP  `1be8e8e7-a899-4a08-90b2-15a4a3a33610`  $51.00 / $30.00  locked=false  variants=10  stock=0  scraped=2026-07-01
      reason: owns 10 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-moisture-glaze-lipstick-refill-37g_R04274921/
DROP  `5d50ff17-3b25-4d98-b9b2-a134cc45c930`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-moisture-glaze-lipstick-refill-37g_R04649128/
      → 2 variants re-pointed to KEEP
DROP  `71125f69-bdec-4eb0-a2f8-07ede8872d4d`  $51.00 / $30.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-moisture-glaze-lipstick-refill-37g_R04553741/
      → 1 variants re-pointed to KEEP
DROP  `ba69be06-045b-4f2b-9cbe-aea1ec11519c`  $51.00 / $30.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-moisture-glaze-lipstick-refill-37g_R04597290/

### Suqqu — Sheer Matte lipstick 4g  (3×)

KEEP  `fbc9f270-42f5-48e3-aa1e-aabe785fdbd0`  $56.00 / $33.00  locked=false  variants=12  stock=0  scraped=2026-07-01
      reason: owns 12 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-sheer-matte-lipstick-4g_R03815291/
DROP  `e34e90ef-2a13-4ae9-a9da-1db2469bf05d`  $56.00 / $33.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-sheer-matte-lipstick-4g_R03985474/
      → 2 variants re-pointed to KEEP
DROP  `89432b50-b597-4e05-a05b-bf7cf1ae5100`  $56.00 / $33.00  locked=false  variants=2  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/suqqu-sheer-matte-lipstick-4g_R03894092/
      → 2 variants re-pointed to KEEP

### Suqqu — Signature Color Eyes eyeshadow palette 6.2g  (4×)

KEEP  `361065be-30a5-426f-aeb4-f7430b41a70a`  $80.00 / $50.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-color-eyes-eyeshadow-palette-62g_R03732471/
DROP  `1e9ad83c-6d5d-4e08-8a48-871540547696`  $80.00 / $50.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-color-eyes-eyeshadow-palette-62g_R03985469/
      → 3 variants re-pointed to KEEP
DROP  `b479c8c9-2464-435f-aa5d-45682c4d0c9b`  $80.00 / $50.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-color-eyes-eyeshadow-palette-62g_R04649126/
      → 2 variants re-pointed to KEEP
DROP  `202b6b0e-818d-4a69-8754-66b423f08b0f`  $80.00 / $50.00  locked=false  variants=2  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-color-eyes-eyeshadow-palette-62g_R04118068/
      → 2 variants re-pointed to KEEP

### Suqqu — Signature Colour Eyes Eyeshadow Palette 6.2g  (4×)

KEEP  `63e9b98c-7a24-425e-83fc-ac09ca385454`  $80.00 / $50.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-colour-eyes-eyeshadow-palette-62g_R04537301/
DROP  `b8ce382c-a070-4391-b30f-0fcbc55b9d3f`  $80.00 / $50.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-colour-eyes-eyeshadow-palette-62g_R04437467/
      → 2 variants re-pointed to KEEP
DROP  `fe2a0d7a-3280-40c0-afc2-3bbfa89366ac`  $80.00 / $50.00  locked=false  variants=2  stock=0  scraped=2026-06-21
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-colour-eyes-eyeshadow-palette-62g_R04622973/
      → 2 variants re-pointed to KEEP
DROP  `96d9baf9-f887-4305-95a0-fea050bab344`  $80.00 / $50.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-signature-colour-eyes-eyeshadow-palette-62g_R04571994/
      → 1 variants re-pointed to KEEP

### Suqqu — Treatment Wrapping lip gloss 5.4g  (2×)

KEEP  `6cd7cc65-d7ec-41e2-841c-1e862fc071e5`  $47.00 / $28.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-treatment-wrapping-lip-gloss-54g_R04118072/
DROP  `392da793-ef85-478f-8f82-d290c5195584`  $47.00 / $28.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-treatment-wrapping-lip-gloss-54g_R04508812/
      → 1 variants re-pointed to KEEP

### Suqqu — Velvet Fit Lipstick Refill 2.1g  (4×)

KEEP  `95559777-c2b6-4bd6-a588-ba4460838a2c`  $51.00 / $30.00  locked=false  variants=11  stock=0  scraped=2026-07-01
      reason: owns 11 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/suqqu-velvet-fit-lipstick-refill-21g_R04437476/
DROP  `0b5fe883-29a9-4258-93bc-4ed039c3cf34`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-velvet-fit-lipstick-refill-21g_R04597289/
      → 2 variants re-pointed to KEEP
DROP  `1db3bf5c-a995-4bcd-b7ba-0e2fce8efb64`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-velvet-fit-lipstick-refill-21g_R04622976/
      → 2 variants re-pointed to KEEP
DROP  `b0f434ca-619c-4d57-914d-d6cb1a2334bd`  $51.00 / $30.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/suqqu-velvet-fit-lipstick-refill-21g_R04537303/
      → 2 variants re-pointed to KEEP

### Tangle Teezer — The Wet Detangler Brush  (2×)

KEEP  `c5bf1016-be56-403b-81db-0d40641cad2d`  $30.00 / $15.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/tangle-teezer-the-wet-detangler-brush_334-3002283-LWDBB010418/
DROP  `41949b73-07a0-4e74-9aee-70a5dbe7c8d3`  $30.00 / $15.00  locked=false  variants=0  stock=0  scraped=2026-06-24
      url: https://www.selfridges.com/GB/en/product/tangle-teezer-the-wet-detangler-brush_R04071812/

### Therabody — TheraFace Depuffing Wand  (2×)

KEEP  `c1c66520-f798-4e84-9c02-3e12e34ba788`  $206.00 / $129.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/therabody-theraface-depuffing-wand_R04442852/
DROP  `401daac7-4bd0-440c-900c-d711812b86f6`  $206.00 / $129.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/therabody-theraface-depuffing-wand_R04442851/

### Therabody — TheraFace PRO Facial Toning Device  (2×)

KEEP  `86140307-0b9f-4b30-8d5a-7beb6b96fb9b`  $599.00 / $375.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/therabody-theraface-pro-facial-toning-device_R03943792/
DROP  `e26db600-32e9-492b-9e58-1cc58256d2f7`  $599.00 / $375.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/therabody-theraface-pro-facial-toning-device_R03943791/

### Too Faced — Better Than Sex mascara 8ml  (2×)

KEEP  `a8ea0cc1-8689-4f36-89d4-e1cfc531538a`  $47.00 / $28.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-better-than-sex-mascara-8ml_R04099342/
DROP  `36e60437-6609-4b87-96a9-e8515572768a`  $47.00 / $28.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-better-than-sex-mascara-8ml_R04311106/

### Too Faced — Kissing Jelly Lip Oil Gloss 5ml  (3×)

KEEP  `926616eb-5051-4f7a-b865-951e580e98f8`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-kissing-jelly-lip-oil-gloss-5ml_R04449999/
DROP  `3e19c91d-1df9-4e99-9aa6-5e47cd43fcb2`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-kissing-jelly-lip-oil-gloss-5ml_R04450000/
      → 1 variants re-pointed to KEEP
DROP  `5d0d1f00-7f16-4842-9edc-c89603878dfe`  $39.00 / $21.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-kissing-jelly-lip-oil-gloss-5ml_R04450001/
      → 1 variants re-pointed to KEEP

### Too Faced — Lip Injection Extreme plumping lip gloss 4g  (2×)

KEEP  `26669457-9f85-4b04-a863-bc75d2797fa7`  $41.00 / $24.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-extreme-plumping-lip-gloss-4g_R04311144/
DROP  `7d9641bc-5b66-49c4-a154-96e8a073bd8b`  $41.00 / $24.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-extreme-plumping-lip-gloss-4g_1020-3004910-90812/
      → 1 variants re-pointed to KEEP

### Too Faced — Lip Injection Maximum Plump lip gloss 4ml  (3×)  ⚠️ price conflict

prices in group: $44.00, $44.00, $41.00
→ price stays **$44.00** (already the highest)

KEEP  `7f1902a4-aecc-4225-a586-f2c0e7c6263e`  $44.00 / $26.00  locked=false  variants=7  stock=0  scraped=2026-07-01
      reason: owns 7 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-maximum-plump-lip-gloss-4ml_R03965566/
DROP  `bd904641-9034-424c-a9e3-31cf92fe6591`  $44.00 / $26.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-maximum-plump-lip-gloss-4ml_R03713293/
DROP  `597e7152-2408-4c62-bd0c-e357a5b13948`  $41.00 / $24.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-maximum-plump-lip-gloss-4ml_R04311143/

### Too Faced — Lip Injection Power Plumping liquid lipstick 3ml  (2×)

KEEP  `60ef5684-6445-4773-852a-5169c8263416`  $41.00 / $24.00  locked=false  variants=8  stock=0  scraped=2026-07-01
      reason: owns 8 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-power-plumping-liquid-lipstick-3ml_R03806139/
DROP  `b0a7b5e6-6696-4548-ba0d-56997d82b296`  $41.00 / $24.00  locked=false  variants=2  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/too-faced-lip-injection-power-plumping-liquid-lipstick-3ml_R03806139-S/
      → 2 variants re-pointed to KEEP

### Too Faced — Quickie Queen Cream Eyeshadow Stick 1.5g  (4×)

KEEP  `0b63a352-9177-4cb2-879c-c7c655af2a73`  $40.00 / $22.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/too-faced-quickie-queen-cream-eyeshadow-stick-15g_R04484192/
DROP  `6a9c5d9d-5138-4729-a3f3-90b30fc18a1f`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-quickie-queen-cream-eyeshadow-stick-15g_R04483522/
      → 1 variants re-pointed to KEEP
DROP  `92a6cf54-d596-4748-9cdd-12d35eff7bd4`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-quickie-queen-cream-eyeshadow-stick-15g_R04483524/
      → 1 variants re-pointed to KEEP
DROP  `ec4f74fe-f174-4d8e-81c3-5de4297df0cd`  $40.00 / $22.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/too-faced-quickie-queen-cream-eyeshadow-stick-15g_R04483526/
      → 1 variants re-pointed to KEEP

### Valentino Beauty — Colour Crush Compact Blush 3.4g  (2×)

KEEP  `a9c3681f-5398-4fd4-885a-57010198b791`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-colour-crush-compact-blush-34g_R04552418/
DROP  `b2ffdd64-4ce5-4742-81b3-eeca2c82e03a`  $63.00 / $39.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-colour-crush-compact-blush-34g_R04552417/
      → 1 variants re-pointed to KEEP

### Valentino Beauty — Liquirosso 2-in-1 lip and blush stick 6.5ml  (2×)  ⚠️ price conflict

prices in group: $56.00, $57.00
→ price normalised to **$57.00** (highest in group)

KEEP  `c87f775c-f92c-4d27-b7d5-5f35898eec9a`  $56.00 / $33.00  locked=false  variants=11  stock=0  scraped=2026-07-01
      reason: owns 11 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-liquirosso-2-in-1-lip-and-blush-stick-65ml_R04218112/
DROP  `614f3453-5cdb-47e6-ba59-264e5aae43d1`  $57.00 / $34.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-liquirosso-2-in-1-lip-and-blush-stick-65ml_R04390242/
      → 1 variants re-pointed to KEEP

### Valentino Beauty — Rosso Valentino Matte refillable lipstick 3.4g  (2×)  ⚠️ price conflict

prices in group: $57.00, $56.00
→ price stays **$57.00** (already the highest)

KEEP  `7e3e41bc-99e3-4d1b-b678-51accc7d8723`  $57.00 / $34.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-matte-refillable-lipstick-34g_R03781551/
DROP  `583c25e4-5879-4a8b-bee7-a257a412b3af`  $56.00 / $33.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-matte-refillable-lipstick-34g_R04155208/
      → 2 variants re-pointed to KEEP

### Valentino Beauty — Rosso Valentino Satin lipstick refill 3.4g  (2×)  ⚠️ price conflict

prices in group: $44.00, $46.00
→ price normalised to **$46.00** (highest in group)

KEEP  `b20b035b-09b2-474e-af46-7e66d379bc02`  $44.00 / $26.00  locked=false  variants=4  stock=0  scraped=2026-07-01
      reason: owns 4 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-satin-lipstick-refill-34g_R03781552/
DROP  `d7bc5d28-c8e5-408e-9a0b-37a2bcebc2cf`  $46.00 / $27.00  locked=false  variants=2  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-satin-lipstick-refill-34g_R04155210/
      → 2 variants re-pointed to KEEP

### Valentino Beauty — Rosso Valentino Satin refillable lipstick 3.4g  (2×)

KEEP  `ae55b4f0-faf4-4e20-a8a1-a6346995e855`  $57.00 / $34.00  locked=false  variants=2  stock=0  scraped=2026-06-29
      reason: owns 2 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-satin-refillable-lipstick-34g_R03781550/
DROP  `0ac4319e-316a-400c-ae1b-e9f04e37c2b1`  $57.00 / $34.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-rosso-valentino-satin-refillable-lipstick-34g_R04155209/
      → 1 variants re-pointed to KEEP

### Valentino Beauty — Spike Ultimatte refillable lipstick 2.3g  (2×)

KEEP  `7494f110-d9f4-4953-bb7c-f9bf055e797c`  $67.00 / $42.00  locked=false  variants=13  stock=0  scraped=2026-07-01
      reason: owns 13 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-spike-ultimatte-refillable-lipstick-23g_R04370828/
DROP  `59869035-00ac-4a60-a6d7-2d77d0023295`  $67.00 / $42.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/valentino-beauty-spike-ultimatte-refillable-lipstick-23g_R04583962/
      → 5 variants re-pointed to KEEP

### Versace — Crystal Noir Eau de Parfum 90ml  (2×)  ⚠️ price conflict

prices in group: $265.00, $190.00
→ price stays **$265.00** (already the highest)

KEEP  `5967079c-fcaf-4cd4-bec6-110ef13f8d9a`  $265.00 / $152.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/versace-crystal-noir-eau-de-parfum-90ml_R04459433/
DROP  `b7fb38f6-6efd-4418-a230-06d0a2aa87a7`  $190.00 / $109.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/versace-crystal-noir-eau-de-parfum-90ml_207-75063778-CN070460/

### Victoria Beckham Beauty — Cell Rejuvenating Illuminator 20ml  (2×)  ⚠️ price conflict

prices in group: $227.00, $122.00
→ price stays **$227.00** (already the highest)

KEEP  `8e6f443a-2d81-4b08-bc33-2f4e2033c2f7`  $227.00 / $142.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image, bestseller)
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-cell-rejuvenating-illuminator-20ml_R04441108/
DROP  `ecfe9875-6ab0-4dd8-8250-6cd4bd3ff5c0`  $122.00 / $76.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-cell-rejuvenating-illuminator-20ml_R04641213/

### Victoria Beckham Beauty — Eye Wardrobe Eyeshadow Refill 6.8g  (2×)

KEEP  `4ddf0137-65f3-4b52-9724-5c9e9d23f5a7`  $77.00 / $48.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-eye-wardrobe-eyeshadow-refill-68g_R04453209/
DROP  `36200974-acf3-4cc3-b3ce-13106eb4376e`  $77.00 / $48.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-eye-wardrobe-eyeshadow-refill-68g_R04589277/
      → 1 variants re-pointed to KEEP

### Victoria Beckham Beauty — Future Lash mascara 4.5g  (2×)

KEEP  `859d9443-c617-4bb7-b877-f9a4960a26c6`  $56.00 / $33.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-future-lash-mascara-45g_R04225648/
DROP  `99baa2d8-73dc-41a0-930d-11e86d73782f`  $56.00 / $33.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-future-lash-mascara-45g_R04537386/
      → 1 variants re-pointed to KEEP

### Victoria Beckham Beauty — Satin Kajal Liner 1.1g  (4×)  ⚠️ price conflict

prices in group: $54.00, $56.00, $56.00, $56.00
→ price normalised to **$56.00** (highest in group)

KEEP  `45fc929a-9cda-4f57-b780-3cbf2f0a2fb3`  $54.00 / $32.00  locked=false  variants=22  stock=0  scraped=2026-07-01
      reason: owns 22 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-satin-kajal-liner-11g_R04225647/
DROP  `67ae4f10-7152-4203-aafd-3bbaf0a9d5ca`  $56.00 / $33.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-satin-kajal-liner-11g_R04537387/
      → 1 variants re-pointed to KEEP
DROP  `4046a602-6653-48ab-b1a8-af0e630e0650`  $56.00 / $33.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-satin-kajal-liner-11g_R04585966/
      → 1 variants re-pointed to KEEP
DROP  `cec732fa-5f19-41f9-935b-47d36aa6588d`  $56.00 / $33.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/victoria-beckham-beauty-satin-kajal-liner-11g_R04485851/
      → 1 variants re-pointed to KEEP

### Westman Atelier — Eye Want You mascara 8.5ml  (2×)

KEEP  `df0fdf0e-114b-4145-bf6d-a422e7f435db`  $67.00 / $42.00  locked=false  variants=1  stock=0  scraped=2026-06-29
      reason: owns 1 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/westman-atelier-eye-want-you-mascara-85ml_R04223374/
DROP  `d84b8a8a-91bc-48db-837e-80a7f43c818c`  $67.00 / $42.00  locked=false  variants=1  stock=0  scraped=2026-06-25
      url: https://www.selfridges.com/GB/en/product/westman-atelier-eye-want-you-mascara-85ml_R04223375/
      → 1 variants re-pointed to KEEP

### Westman Atelier — Face Trace Contour Stick 6g  (2×)

KEEP  `8d2b1ef0-574d-4425-8157-7b299da8125d`  $71.00 / $44.00  locked=false  variants=5  stock=0  scraped=2026-07-01
      reason: owns 5 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/westman-atelier-face-trace-contour-stick-6g_R04585972/
DROP  `d68067c3-2c81-4ab9-a183-f728e29b8cfc`  $71.00 / $44.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/westman-atelier-face-trace-contour-stick-6g_R03728003/
      → 3 variants re-pointed to KEEP

### Westman Atelier — Lit Up highlight stick 5g  (2×)

KEEP  `d24610d0-19ee-4fb7-b731-129707b5d2e1`  $71.00 / $44.00  locked=false  variants=3  stock=0  scraped=2026-07-01
      reason: owns 3 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/westman-atelier-lit-up-highlight-stick-5g_R03728001/
DROP  `b64918bd-b54c-4880-a657-6ed65dc04a03`  $71.00 / $44.00  locked=false  variants=1  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/westman-atelier-lit-up-highlight-stick-5g_R04421737/
      → 1 variants re-pointed to KEEP

### Yves Saint Laurent — Loveshine Candy Glaze Lip Gloss Stick 3.2g  (2×)

KEEP  `d19de815-ac6b-49bd-a35f-510f37dcf6d4`  $66.00 / $41.00  locked=false  variants=6  stock=0  scraped=2026-07-01
      reason: owns 6 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-loveshine-candy-glaze-lip-gloss-stick-32g_R04298316/
DROP  `ecdf20a6-dc41-410d-b27f-d750d869ceab`  $66.00 / $41.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-loveshine-candy-glaze-lip-gloss-stick-32g_R04598423/

### Yves Saint Laurent — Or Rouge La Crème Riche anti-aging face cream refill 50ml  (2×)

KEEP  `6bd2cb6d-15aa-4f0e-a8ca-873f2a79e954`  $436.00 / $273.00  locked=false  variants=0  stock=0  scraped=2026-06-29
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-or-rouge-la-creme-riche-anti-aging-face-cream-refill-50ml_R04317635/
DROP  `e6e58ff0-0e36-4976-8584-2ef28b676f7b`  $436.00 / $273.00  locked=false  variants=0  stock=0  scraped=2026-06-27
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-or-rouge-la-creme-riche-anti-aging-face-cream-refill-50ml_R04057980/

### Yves Saint Laurent — Rouge Pur Couture refillable lipstick 3.8ml  (2×)

KEEP  `d9f5e689-f002-40cb-bf71-8d712c873893`  $64.00 / $40.00  locked=false  variants=24  stock=0  scraped=2026-06-29
      reason: owns 24 product_variants (most in group)
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-rouge-pur-couture-refillable-lipstick-38ml_R04219560/
DROP  `bb4306d0-d7e1-4555-aacb-af98ebbeb24e`  $64.00 / $40.00  locked=false  variants=3  stock=0  scraped=2026-06-29
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-rouge-pur-couture-refillable-lipstick-38ml_R04302867/
      → 3 variants re-pointed to KEEP

### Yves Saint Laurent — Touche Éclat Illuminating Pen 2.5ml  (2×)  ⚠️ price conflict

prices in group: $57.00, $59.00
→ price normalised to **$59.00** (highest in group)

KEEP  `88957317-ffb2-4304-a78f-14fe81a6c04d`  $57.00 / $34.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      reason: richest row (has image)
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-touche-eclat-illuminating-pen-25ml_456-84033258-TOUCHEECLATSHADES/
DROP  `64ea615e-72f7-4b54-88e9-4d3995850397`  $59.00 / $35.00  locked=false  variants=0  stock=0  scraped=2026-07-01
      url: https://www.selfridges.com/GB/en/product/yves-saint-laurent-touche-eacuteclat-illuminating-pen-25ml_456-84033258-L3218400/
