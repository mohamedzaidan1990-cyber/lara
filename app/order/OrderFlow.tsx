"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrderStepper from "@/components/OrderStepper";
import { BeeMascot } from "@/components/BeeMascot";

interface Props {
  whish: string;
}

interface ExchangeRateResponse {
  rate: number;
  markup: number;
  effective_rate: number;
}

const FALLBACK_EFFECTIVE_RATE = 1.33 * 1.1; // matches lib/currency.ts fallback × markup

interface CustomerForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface CreatedOrder {
  order_number: string;
  customer_id: string;
  order_id: string;
  payment_method: PaymentMethod;
}

type PaymentMethod = "whish_direct" | "whish_link";

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024; // 4MB
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default function OrderFlow({ whish }: Props) {
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
    email: "",
    address: "",
    notes: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("whish_direct");
  const [screenshot, setScreenshot] = useState<{ name: string; dataUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedOrder | null>(null);
  const [effectiveRate, setEffectiveRate] = useState<number>(FALLBACK_EFFECTIVE_RATE);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exchange-rate")
      .then((res) => (res.ok ? (res.json() as Promise<ExchangeRateResponse>) : null))
      .then((data) => {
        if (!cancelled && data && Number.isFinite(data.effective_rate) && data.effective_rate > 0) {
          setEffectiveRate(data.effective_rate);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (!form.full_name || !form.phone || !form.email || !form.address) {
        throw new Error("Name, phone, email and address are required.");
      }
      if (!EMAIL_RE.test(form.email.trim())) {
        throw new Error("Please enter a valid email address.");
      }
      if (paymentMethod === "whish_direct" && !screenshot) {
        throw new Error("Please upload a screenshot of your Whish transfer.");
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          email: form.email.trim(),
          address: form.address,
          notes: form.notes,
          product_brand: productDraft.brand,
          product_name: productDraft.name,
          product_url: productDraft.url,
          price_gbp: productDraft.gbp,
          price_usd: productDraft.usd,
          payment_method: paymentMethod,
          payment_screenshot: paymentMethod === "whish_direct" ? screenshot?.dataUrl ?? null : null
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create order");
      }
      const data = (await res.json()) as Omit<CreatedOrder, "payment_method">;
      setCreated({ ...data, payment_method: paymentMethod });
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const isComplexion = /foundation|concealer|tint|bb cream|cc cream|cushion|complexion/i.test(productDraft.name);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <OrderStepper current={step} />

      {isComplexion && step < 4 ? (
        <Link
          href="/shade-finder"
          className="mt-6 flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/15 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold/25"
        >
          Not sure about your shade? Try our Shade Finder 🐝
        </Link>
      ) : null}

      <div className="mt-12">
        {step === 1 ? (
          <Step1Product
            product={productDraft}
            onChange={(p) => setProductDraft(p)}
            onNext={() => setStep(2)}
            effectiveRate={effectiveRate}
          />
        ) : null}

        {step === 2 ? (
          <Step2Details
            form={form}
            update={update}
            product={productDraft}
            onBack={() => setStep(1)}
            onNext={() => {
              if (!form.full_name || !form.phone || !form.email || !form.address) {
                setError("Name, phone, email and address are required.");
                return;
              }
              if (!EMAIL_RE.test(form.email.trim())) {
                setError("Please enter a valid email address.");
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
          <p className="mt-6 rounded border border-accent/40 bg-accent/5 p-4 text-sm text-accent-700">{error}</p>
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
  onNext,
  effectiveRate
}: {
  product: ProductDraft;
  onChange: (p: ProductDraft) => void;
  onNext: () => void;
  effectiveRate: number;
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
                onChange({ ...product, gbp, usd: Math.round(gbp * effectiveRate * 100) / 100 });
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
        We deliver door to door in 10–14 working days.
      </p>

      <ProductSummary product={product} />

      <div className="mt-8 space-y-5">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Phone number</label>
          <input
            className="input"
            placeholder="03 000 000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
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
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
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
      <p className="mt-2 text-sm text-ink/70">Choose how you&apos;d like to pay.</p>

      <ProductSummary product={product} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <PaymentCard
          active={paymentMethod === "whish_direct"}
          onSelect={() => setPaymentMethod("whish_direct")}
          label="Option 1"
          title="Direct Whish transfer"
          description={
            <>
              <p className="text-sm text-ink">
                Send to Whish number <strong>{whish}</strong> and upload your screenshot below.
              </p>
              <p className="mt-2 text-xs text-ink/60">Instant. Manual verification by our team.</p>
            </>
          }
        />
        <PaymentCard
          active={paymentMethod === "whish_link"}
          onSelect={() => setPaymentMethod("whish_link")}
          label="Option 2"
          title="Whish payment link"
          description={
            <>
              <p className="text-sm text-ink">
                We&apos;ll send you a secure Whish payment link by WhatsApp after you submit your order.
              </p>
              <p className="mt-2 text-xs text-ink/60">No screenshot upload required.</p>
            </>
          }
        />
      </div>

      {paymentMethod === "whish_direct" ? (
        <WhishDirectInstructions
          whish={whish}
          screenshot={screenshot}
          onScreenshotChange={onScreenshotChange}
        />
      ) : (
        <WhishLinkInstructions />
      )}

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

function PaymentCard({
  active,
  onSelect,
  label,
  title,
  description
}: {
  active: boolean;
  onSelect: () => void;
  label: string;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "border p-5 text-left transition-colors " +
        (active ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink")
      }
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">{label}</p>
      <p className="mt-2 font-serif text-2xl text-ink">{title}</p>
      <div className="mt-3">{description}</div>
    </button>
  );
}

function WhishDirectInstructions({
  whish,
  screenshot,
  onScreenshotChange
}: {
  whish: string;
  screenshot: { name: string; dataUrl: string } | null;
  onScreenshotChange: (f: File | null) => void;
}) {
  const steps = [
    "Open Whish",
    "Tap Send Money",
    `Enter number ${whish}`,
    "Enter the order amount",
    "Screenshot the confirmation",
    "Upload the screenshot below"
  ];

  return (
    <div className="mt-8 border border-ink/15 bg-cream p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">How to pay with Whish</p>
      <ol className="mt-4 grid gap-2 text-sm text-ink/80 sm:grid-cols-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gold font-serif text-xs text-ink">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 border-t border-ink/10 pt-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">Upload payment screenshot</p>
        <p className="mt-2 text-sm text-ink/70">
          Required. Max 4MB. JPG, PNG or HEIC.
        </p>
        <input
          type="file"
          accept="image/*"
          className="mt-4 block w-full text-sm text-ink file:mr-4 file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-white hover:file:bg-accent-600"
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
    </div>
  );
}

function WhishLinkInstructions() {
  return (
    <div className="mt-8 border border-ink/15 bg-cream p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">What happens next</p>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        After submitting your order, send your invoice to our WhatsApp and we&apos;ll generate a secure Whish
        payment link for you. You&apos;ll receive automatic payment confirmation and receipt via WhatsApp.
      </p>
      <p className="mt-3 text-xs text-ink/60">No screenshot upload required for this option.</p>
    </div>
  );
}

function Step4Confirmation({
  order,
  product
}: {
  order: CreatedOrder;
  product: ProductDraft;
}) {
  const baseMessage =
    order.payment_method === "whish_link"
      ? `Hi Seasons by B, my order number is ${order.order_number} for ${product.name}. Please send me a Whish payment link.`
      : `Hi Seasons by B, my order number is ${order.order_number} for ${product.name}. I have sent payment via Whish.`;
  const wa = `https://wa.me/96103055491?text=${encodeURIComponent(baseMessage)}`;

  return (
    <section className="text-center">
      <div className="flex justify-center">
        <BeeMascot variant="success" />
      </div>
      <p className="mt-2 font-serif text-2xl text-ink">Your order is on its way to London! 🐝</p>
      <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-accent">Order received</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Thank you</h1>
      <p className="mt-3 text-sm text-ink/70">
        Your order number is{" "}
        <span className="font-mono text-ink">{order.order_number}</span>. Estimated delivery: 10–14 working days.
      </p>
      <p className="mt-2 text-sm text-ink/70">
        A confirmation email has been sent. Seasons by B will be in touch shortly.
      </p>

      <div className="mx-auto mt-8 max-w-md border border-ink/15 bg-cream p-6 text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink/60">What happens next</p>
        {order.payment_method === "whish_link" ? (
          <ol className="mt-3 space-y-2 text-sm text-ink/80">
            <li>1. Send your invoice to our WhatsApp.</li>
            <li>2. We&apos;ll send you a secure Whish payment link.</li>
            <li>3. You&apos;ll get automatic confirmation and receipt by WhatsApp once paid.</li>
          </ol>
        ) : (
          <ol className="mt-3 space-y-2 text-sm text-ink/80">
            <li>1. Send your payment screenshot via WhatsApp so we can confirm.</li>
            <li>2. We&apos;ll process your order as soon as payment is verified.</li>
            <li>3. We&apos;ll keep you updated by email and WhatsApp on shipping and delivery.</li>
          </ol>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a href={wa} target="_blank" rel="noreferrer" className="btn-gold">
          {order.payment_method === "whish_link" ? "Send invoice on WhatsApp" : "Send confirmation on WhatsApp"}
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
