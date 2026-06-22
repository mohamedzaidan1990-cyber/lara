// Generates Instagram post (1080x1350) and story (1080x1920) HTML templates
// in the Seasons by B candy brand system. Screenshot via Edge headless.
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("html", { recursive: true });

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DM Sans',sans-serif; background:#fef7ff; color:#2e1a28; overflow:hidden; }
.post  { width:1080px; height:1350px; position:relative; }
.story { width:1080px; height:1920px; position:relative; }
.eyebrow { font-size:26px; font-weight:700; letter-spacing:0.32em; text-transform:uppercase; color:#e040a0; }
.headline { font-weight:900; line-height:1.02; letter-spacing:-0.02em; }
.chip { display:inline-block; background:#ffd6ee; color:#2e1a28; border-radius:999px; padding:14px 34px; font-weight:700; font-size:30px; }
.price { display:inline-block; background:#e040a0; color:#fff; border-radius:999px; padding:16px 40px; font-weight:900; font-size:40px; }
.cta { display:inline-block; background:#2e1a28; color:#fff; border-radius:999px; padding:20px 48px; font-weight:700; font-size:30px; letter-spacing:0.14em; text-transform:uppercase; }
.footer { position:absolute; bottom:44px; left:0; right:0; display:flex; justify-content:center; gap:18px; font-size:26px; font-weight:500; color:#907898; letter-spacing:0.08em; }
.blob { position:absolute; border-radius:50%; filter:blur(2px); }
.imgwrap { background:#fff; border-radius:48px; overflow:hidden; box-shadow:0 25px 70px rgba(224,64,160,0.18); }
.imgwrap img { width:100%; height:100%; object-fit:cover; display:block; }
.bee { font-size:44px; }
`;

const FOOTER = `<div class="footer"><span>@seasonsbyb</span><span>·</span><span>seasonsbyb.co.uk</span><span>·</span><span>London → Lebanon 🇱🇧</span></div>`;

function page(cls, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="${cls}">${body}</div></body></html>`;
}

const files = {};

/* ---------- POST 1: Most Wanted — Baccarat Rouge 540 ---------- */
files["post-1-most-wanted-baccarat"] = page("post", `
  <div class="blob" style="width:560px;height:560px;background:#ffd6ee;top:-180px;right:-160px;"></div>
  <div class="blob" style="width:360px;height:360px;background:#fdeaf6;bottom:120px;left:-140px;"></div>
  <div style="padding:84px 84px 0;position:relative;">
    <div class="eyebrow">Most wanted · This week</div>
    <div class="headline" style="font-size:92px;margin-top:18px;">Baccarat<br>Rouge 540</div>
    <div style="font-size:34px;font-weight:500;color:#604868;margin-top:16px;">Maison Francis Kurkdjian · Extrait de Parfum</div>
  </div>
  <div class="imgwrap" style="position:absolute;top:430px;left:240px;width:600px;height:660px;">
    <img src="../photos/baccarat-rouge-540.jpg">
  </div>
  <div style="position:absolute;top:1130px;left:0;right:0;text-align:center;">
    <span class="price">$586</span>
    <span class="chip" style="margin-left:18px;">DM 🐝 to order</span>
  </div>
  ${FOOTER}
`);

/* ---------- POST 2: Icon spotlight — La Mer ---------- */
files["post-2-icon-la-mer"] = page("post", `
  <div style="position:absolute;inset:0;background:#fff;"></div>
  <div class="imgwrap" style="position:absolute;top:0;left:0;width:1080px;height:760px;border-radius:0;box-shadow:none;">
    <img src="../photos/la-mer-creme-100ml.jpg" style="object-position:center 40%;">
  </div>
  <div style="position:absolute;top:700px;left:60px;right:60px;background:#fef7ff;border-radius:48px;padding:64px 70px;box-shadow:0 25px 70px rgba(224,64,160,0.16);">
    <div class="eyebrow">The icon</div>
    <div class="headline" style="font-size:76px;margin-top:14px;">Crème de la Mer</div>
    <div style="font-size:32px;color:#604868;margin-top:14px;line-height:1.4;">The moisturiser that started it all — sourced from Selfridges London, delivered to your door in Lebanon.</div>
    <div style="margin-top:30px;"><span class="price">from $243</span><span class="chip" style="margin-left:18px;">10–14 days · tracked</span></div>
  </div>
  ${FOOTER}
`);

/* ---------- POST 3: How it works — 4 product grid ---------- */
files["post-3-london-to-lebanon"] = page("post", `
  <div class="blob" style="width:700px;height:700px;background:#fdeaf6;top:-250px;left:-200px;"></div>
  <div style="padding:84px;position:relative;">
    <div class="eyebrow">Personal shopping</div>
    <div class="headline" style="font-size:84px;margin-top:16px;">London's finest.<br>Delivered to Lebanon.</div>
  </div>
  <div style="position:absolute;top:420px;left:84px;right:84px;display:grid;grid-template-columns:1fr 1fr;gap:28px;">
    <div class="imgwrap" style="height:330px;background:#fff;"><img src="../photos/ct-setting-spray.jpg" style="object-fit:contain;padding:18px;"></div>
    <div class="imgwrap" style="height:330px;background:#fff;"><img src="../photos/chanel-les-beiges-bronzer.jpg" style="object-fit:contain;padding:18px;"></div>
    <div class="imgwrap" style="height:330px;background:#fff;"><img src="../photos/augustinus-bader-rich-cream.jpg" style="object-fit:contain;padding:18px;"></div>
    <div class="imgwrap" style="height:330px;background:#fff;"><img src="../photos/le-labo-santal-33.jpg" style="object-fit:contain;padding:18px;"></div>
  </div>
  <div style="position:absolute;top:1170px;left:84px;right:84px;display:flex;gap:14px;justify-content:center;">
    <span class="chip" style="font-size:25px;padding:12px 26px;white-space:nowrap;">1 · You DM us</span><span class="chip" style="font-size:25px;padding:12px 26px;white-space:nowrap;">2 · We buy in London</span><span class="chip" style="font-size:25px;padding:12px 26px;white-space:nowrap;">3 · It ships to you</span>
  </div>
  ${FOOTER}
`);

/* ---------- POST 4: Shade Finder promo ---------- */
files["post-4-shade-finder"] = page("post", `
  <div style="position:absolute;inset:0;background:linear-gradient(160deg,#e040a0 0%,#c62f88 55%,#7c52aa 100%);"></div>
  <div style="padding:90px;position:relative;color:#fff;">
    <div class="eyebrow" style="color:#ffd6ee;">New on seasonsbyb.co.uk</div>
    <div class="headline" style="font-size:96px;margin-top:18px;color:#fff;">Find your<br>perfect shade<br>in 60 seconds.</div>
    <div style="font-size:34px;margin-top:26px;line-height:1.45;color:#ffe6f4;max-width:760px;">Our Shade Finder matches your skin tone, undertone and finish to the exact foundation shade — before you order.</div>
  </div>
  <div class="imgwrap" style="position:absolute;bottom:230px;right:90px;width:420px;height:480px;transform:rotate(4deg);">
    <img src="../photos/ct-setting-spray.jpg">
  </div>
  <div style="position:absolute;bottom:240px;left:90px;">
    <div class="cta" style="background:#fff;color:#e040a0;">Try it → seasonsbyb.co.uk 🐝</div>
  </div>
  <div class="footer" style="color:#ffd6ee;"><span>@seasonsbyb</span><span>·</span><span>seasonsbyb.co.uk</span></div>
`);

/* ---------- POST 5: Bestseller under $50 ---------- */
files["post-5-under-50-kiehls"] = page("post", `
  <div class="blob" style="width:620px;height:620px;background:#ffd6ee;bottom:-200px;right:-180px;"></div>
  <div style="padding:84px;position:relative;">
    <div class="eyebrow">Bestseller · Under $50</div>
    <div class="headline" style="font-size:86px;margin-top:16px;">The eye cream<br>everyone repurchases.</div>
  </div>
  <div class="imgwrap" style="position:absolute;top:380px;left:215px;width:650px;height:640px;">
    <img src="../photos/kiehls-avocado-eye.jpg">
  </div>
  <div style="position:absolute;top:1075px;left:0;right:0;text-align:center;">
    <div style="font-size:36px;font-weight:700;">Kiehl's Creamy Eye Treatment with Avocado</div>
    <div style="margin-top:24px;"><span class="price">$46</span><span class="chip" style="margin-left:18px;">DM 🐝 to order</span></div>
  </div>
  ${FOOTER}
`);

/* ---------- STORY 1: Spotlight + DM CTA ---------- */
files["story-1-spotlight-baccarat"] = page("story", `
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#fef7ff 0%,#ffe6f4 100%);"></div>
  <div style="padding:120px 90px 0;position:relative;text-align:center;">
    <div class="eyebrow">Back in stock 🐝</div>
    <div class="headline" style="font-size:104px;margin-top:20px;">Baccarat<br>Rouge 540</div>
  </div>
  <div class="imgwrap" style="position:absolute;top:520px;left:165px;width:750px;height:880px;">
    <img src="../photos/baccarat-rouge-540.jpg">
  </div>
  <div style="position:absolute;top:1460px;left:0;right:0;text-align:center;">
    <span class="price" style="font-size:48px;padding:20px 52px;">$586 · delivered</span>
    <div style="margin-top:36px;"><span class="cta">Reply 🐝 to order</span></div>
  </div>
  <div class="footer" style="bottom:60px;"><span>@seasonsbyb</span><span>·</span><span>London → Lebanon</span></div>
`);

/* ---------- STORY 2: This or That poll ---------- */
files["story-2-this-or-that"] = page("story", `
  <div style="position:absolute;inset:0;background:#2e1a28;"></div>
  <div style="padding:130px 90px 0;position:relative;text-align:center;color:#fff;">
    <div class="eyebrow" style="color:#f080c0;">Date night decision</div>
    <div class="headline" style="font-size:96px;margin-top:18px;color:#fff;">This or that?</div>
  </div>
  <div style="position:absolute;top:520px;left:80px;right:80px;display:grid;grid-template-columns:1fr 1fr;gap:36px;">
    <div>
      <div class="imgwrap" style="height:620px;border-radius:40px;"><img src="../photos/coco-mademoiselle.jpg"></div>
      <div style="text-align:center;margin-top:28px;color:#fff;font-weight:700;font-size:34px;">COCO<br>MADEMOISELLE</div>
    </div>
    <div>
      <div class="imgwrap" style="height:620px;border-radius:40px;"><img src="../photos/bleu-de-chanel.jpg"></div>
      <div style="text-align:center;margin-top:28px;color:#fff;font-weight:700;font-size:34px;">BLEU<br>DE CHANEL</div>
    </div>
  </div>
  <div style="position:absolute;top:1420px;left:0;right:0;text-align:center;">
    <span class="chip" style="font-size:34px;padding:18px 44px;">Tap to vote — poll sticker here 👆</span>
    <div style="margin-top:32px;color:#907898;font-size:28px;">Both delivered to Lebanon in 10–14 days</div>
  </div>
  <div class="footer" style="bottom:60px;color:#907898;"><span>@seasonsbyb</span></div>
`);

/* ---------- STORY 3: Shade Finder ---------- */
files["story-3-shade-finder"] = page("story", `
  <div style="position:absolute;inset:0;background:linear-gradient(170deg,#e040a0,#7c52aa);"></div>
  <div style="padding:150px 100px 0;position:relative;color:#fff;">
    <div class="eyebrow" style="color:#ffd6ee;">Stop guessing your shade</div>
    <div class="headline" style="font-size:110px;margin-top:24px;color:#fff;">Wrong-shade<br>foundation is<br>over. 🐝</div>
    <div style="font-size:38px;margin-top:40px;line-height:1.5;color:#ffe6f4;">Take our 60-second Shade Finder and get matched to your exact shade before you order.</div>
  </div>
  <div style="position:absolute;top:1000px;left:100px;right:100px;background:#fff;border-radius:48px;padding:60px;color:#2e1a28;">
    <div style="font-weight:900;font-size:44px;">How it works</div>
    <div style="font-size:34px;margin-top:24px;line-height:1.7;">1 · Pick your skin tone &amp; undertone<br>2 · Choose coverage &amp; finish<br>3 · Get your exact shade match</div>
  </div>
  <div style="position:absolute;top:1560px;left:0;right:0;text-align:center;">
    <span class="cta" style="background:#fff;color:#e040a0;">Link in bio → Shade Finder</span>
  </div>
  <div class="footer" style="bottom:60px;color:#ffd6ee;"><span>seasonsbyb.co.uk/shade-finder</span></div>
`);

/* ---------- STORY 4: New in ---------- */
files["story-4-new-in-lisa-eldridge"] = page("story", `
  <div style="position:absolute;inset:0;background:#fef7ff;"></div>
  <div class="blob" style="width:800px;height:800px;background:#ffd6ee;top:-300px;right:-280px;"></div>
  <div style="padding:140px 90px 0;position:relative;">
    <div class="eyebrow">Just landed from London</div>
    <div class="headline" style="font-size:96px;margin-top:20px;">One stick.<br>Lips + cheeks.</div>
    <div style="font-size:36px;color:#604868;margin-top:24px;">Lisa Eldridge · Velatura Dewy Balm — shade Cinnamon Bun</div>
  </div>
  <div class="imgwrap" style="position:absolute;top:640px;left:140px;width:800px;height:860px;">
    <img src="../photos/lisa-eldridge-lip-cheek.jpg">
  </div>
  <div style="position:absolute;top:1580px;left:0;right:0;text-align:center;">
    <span class="price" style="font-size:44px;">$42</span>
    <span class="cta" style="margin-left:20px;">DM 🐝 to order</span>
  </div>
  <div class="footer" style="bottom:60px;"><span>@seasonsbyb</span><span>·</span><span>seasonsbyb.co.uk</span></div>
`);

for (const [name, html] of Object.entries(files)) {
  writeFileSync(`html/${name}.html`, html);
  console.log(`wrote html/${name}.html`);
}
