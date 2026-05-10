"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrderStepper from "@/components/OrderStepper";

interface Props {
  whish: string;
  bankIban: string;
  bankName: string;
  accountHolder: string;
}

interface CustomerForm {
  full_name: string;
  phone: string;
  address: string;
  notes: string;
}

interface CreatedOrder {
  order_number: string;
  customer_id: string;
  order_id: string;
}

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024; // 4MB

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default function OrderFlow({ whish, bankIban, bankName, accountHolder }: Props) {
  const params = useSearchParams();

  const product = useMemo(() => {
    return {
      brand: params.get("brand") ?? "",
      name: params.get("name") ?? "",
      gbp: Number(params.get("gbp") ?? 0),
      usd: Number(params.get("usd") ?? 0),
      url: params.get("url") ?? ""
    };
  }, [params]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(product.name ? 2 : 1);
  const [productDraft, setProductDraft] = useState({
    brand: product.brand,
    name: product.name,
    usd: product.usd,
    gbp: product.gbp,
    url: product.url
  });

  const [form, setForm] = useState<CustomerForm>({
    full_name: "",
    phone: "",
    address: "",
    notes: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<"whish" | "bank">("whish");
  const [screenshot, setScreenshot] = useState<{ name: string; dataUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedOrder | null>(null);

  function update<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleScreenshot(file: File | null) {
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot must be under 4MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot({ name: file.name, dataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      if (!productDraft.name || !productDraft.brand) {
        throw new Error("Please confirm the product details.");
      }
      if (!form.full_name || !form.phone || !form.address) {
        throw new Error("Name, phone and address are required.");
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          product_brand: productDraft.brand,
          product_name: productDraft.name,
          product_url: productDraft.url,
          price_gbp: productDraft.gbp,
          price_usd: productDraft.usd,
          payment_method: paymentMethod,
          payment_screenshot: screenshot?.dataUrl ?? null
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create order");
      }
      const data = (await res.json()) as CreatedOrder;
      setCreated(data);
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <OrderStepper current={step} />

      <div className="mt-12">
        {step === 1 ? (
          <Step1Product
            product={productDraft}
            onChange={(p) => setProductDraft(p)}
            onNext={() => setStep(2)}
          />
        ) : null}

        {step === 2 ? (
          <Step2Details
            form={form}
            update={update}
            product={productDraft}
            onBack={() => setStep(1)}
            onNext={() => {
              if (!form.full_name || !form.phone || !form.address) {
                setError("Name, phone and address are required.");
                return;
              }
              setError(null);
              setStep(3);
            }}
          />
        ) : null}

        {step === 3 ? (
          <Step3Payment
            whish={whish}
            bankIban={bankIban}
            bankName={bankName}
            accountHolder={accountHolder}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            screenshot={screenshot}
            onScreenshotChange={handleScreenshot}
            onBack={() => setStep(2)}
            onSubmit={submitOrder}
            submitting={submitting}
            product={productDraft}
          />
        ) : null}

        {step === 4 && created ? (
          <Step4Confirmation order={created} product={productDraft} />
        ) : null}

        {error ? (
          <p className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

interface ProductDraft {
  brand: string;
  name: string;
  gbp: number;
  usd: number;
  url: string;
}

function Step1Product({
  product,
  onChange,
  onNext
}: {
  product: ProductDraft;
  onChange: (p: ProductDraft) => void;
  onNext: () => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-3xl text-ink">Confirm what you&apos;d like</h1>
      <p className="mt-2 text-sm text-ink/70">
        Tell us the brand, item and price. If you came from the catalogue, we&apos;ve filled it in for you.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="label">Brand</label>
          <input
            className="input"
            value={product.brand}
            onChange={(e) => onChange({ ...product, brand: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Product name</label>
          <input
            className="input"
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Price (GBP)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input"
              value={product.gbp || ""}
              onChange={(e) => {
                const gbp = Number(e.target.value) || 0;
                const rate = 1.27;
                onChange({ ...product, gbp, usd: Math.round(gbp * 1.1 * rate * 100) / 100 });
              }}
            />
          </div>
          <div>
            <label className="label">Price (USD)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input"
              value={product.usd || ""}
              onChange={(e) => onChange({ ...product, usd: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div>
          <label className="label">Product URL (optional)</label>
          <input
            className="input"
            placeholder="https://..."
            value={product.url}
            onChange={(e) => onChange({ ...product, url: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button type="button" className="btn-primary" onClick={onNext}>
          Continue
        </button>
      </div>
    </section>
  );
}

function Step2Details({
  form,
  update,
  product,
  onBack,
  onNext
}: {
  form: CustomerForm;
  update: <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => void;
  product: ProductDraft;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-3xl text-ink">Your delivery details</h1>
      <p className="mt-2 text-sm text-ink/70">
        We deliver door to door in 10–14 working days across Lebanon.
      </p>

      <ProductSummary product={product} />

      <div className="mt-8 space-y-5">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Lebanese phone number</label>
          <input
            className="input"
            placeholder="03 000 000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Delivery address</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="Building, street, area, city"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="Size, colour preferences, gift wrap…"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <button type="button" className="btn-outline" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          Continue to payment
        </button>
      </div>
    </section>
  );
}

function Step3Payment({
  whish,
  bankIban,
  bankName,
  accountHolder,
  paymentMethod,
  setPaymentMethod,
  screenshot,
  onScreenshotChange,
  onBack,
  onSubmit,
  submitting,
  product
}: {
  whish: string;
  bankIban: string;
  bankName: string;
  accountHolder: string;
  paymentMethod: "whish" | "bank";
  setPaymentMethod: (v: "whish" | "bank") => void;
  screenshot: { name: string; dataUrl: string } | null;
  onScreenshotChange: (f: File | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  product: ProductDraft;
}) {
  return (
    <section>
      <h1 className="font-serif text-3xl text-ink">Payment</h1>
      <p className="mt-2 text-sm text-ink/70">Full payment upfront. Choose your preferred method.</p>

      <ProductSummary product={product} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPaymentMethod("whish")}
          className={
            "border p-5 text-left transition-colors " +
            (paymentMethod === "whish" ? "border-gold bg-gold/5" : "border-ink/15 hover:border-ink")
          }
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Option 1</p>
          <p className="mt-2 font-serif text-2xl text-ink">Whish</p>
          <p className="mt-3 text-sm text-ink">Send to {whish}</p>
          <p className="mt-1 text-xs text-ink/60">{accountHolder}</p>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod("bank")}
          className={
            "border p-5 text-left transition-colors " +
            (paymentMethod === "bank" ? "border-gold bg-gold/5" : "border-ink/15 hover:border-ink")
          }
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Option 2</p>
          <p className="mt-2 font-serif text-2xl text-ink">Bank transfer</p>
          <p className="mt-3 text-sm text-ink">{bankName}</p>
          <p className="mt-1 break-all text-xs text-ink/70">IBAN {bankIban}</p>
          <p className="mt-1 text-xs text-ink/60">{accountHolder}</p>
        </button>
      </div>

      <div className="mt-8 border border-ink/15 p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Upload payment screenshot</p>
        <p className="mt-2 text-sm text-ink/70">
          After paying, attach a screenshot of the confirmation. Max 4MB.
        </p>
        <input
          type="file"
          accept="image/*"
          className="mt-4 block w-full text-sm text-ink file:mr-4 file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-white hover:file:bg-gold"
          onChange={(e) => onScreenshotChange(e.target.files?.[0] ?? null)}
        />
        {screenshot ? (
          <div className="mt-4">
            <p className="text-xs text-ink/70">Attached: {screenshot.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshot.dataUrl}
              alt="Payment screenshot preview"
              className="mt-2 max-h-56 rounded border border-ink/10 object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex justify-between">
        <button type="button" className="btn-outline" onClick={onBack} disabled={submitting}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Place order"}
        </button>
      </div>
    </section>
  );
}

function Step4Confirmation({
  order,
  product
}: {
  order: CreatedOrder;
  product: ProductDraft;
}) {
  const message = `Hi Lara, my order number is ${order.order_number} for ${product.name}. I have sent payment.`;
  const wa = `https://wa.me/96103055491?text=${encodeURIComponent(message)}`;

  return (
    <section className="text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-gold">Order received</p>
      <h1 className="mt-4 font-serif text-4xl text-ink">Thank you</h1>
      <p className="mt-3 text-sm text-ink/70">
        Your order number is{" "}
        <span className="font-mono text-ink">{order.order_number}</span>. Estimated delivery: 10–14 working days.
      </p>

      <div className="mx-auto mt-8 max-w-md border border-ink/15 p-6 text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">What happens next</p>
        <ol className="mt-3 space-y-2 text-sm text-ink/80">
          <li>1. Send your payment screenshot via WhatsApp so we can confirm.</li>
          <li>2. We&apos;ll process your order as soon as payment is verified.</li>
          <li>3. We&apos;ll keep you updated on shipping and delivery.</li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-gold">
          Send confirmation on WhatsApp
        </a>
        <Link href="/" className="btn-outline">
          Back to shop
        </Link>
      </div>
    </section>
  );
}

function ProductSummary({ product }: { product: ProductDraft }) {
  if (!product.name && !product.brand) return null;
  return (
    <div className="mt-6 flex items-center justify-between border border-ink/15 bg-ink/[0.02] px-5 py-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{product.brand}</p>
        <p className="mt-1 text-sm text-ink">{product.name}</p>
      </div>
      <p className="font-serif text-lg text-ink">{formatUsd(product.usd)}</p>
    </div>
  );
}
