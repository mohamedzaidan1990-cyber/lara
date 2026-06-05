import Link from "next/link";
import type { Metadata } from "next";
import { whatsappRequestLink } from "@/lib/links";
import BespokeChat from "@/components/BespokeChat";

export const metadata: Metadata = {
  title: "Bespoke Sourcing — Your Personal Shopper in London",
  description:
    "Tell us what you want — bags, rare finds, limited editions, sold-out pieces — and we'll source it from London's finest boutiques and deliver to your door."
};

const GOLD = "#F4D360";
const INK = "#23272A";

const STEPS = [
  {
    icon: "💬",
    title: "Tell us what you want",
    body: "Message us on Instagram or by email with the brand, product name, or even a photo of what you're after."
  },
  {
    icon: "🔎",
    title: "We find it",
    body: "We source from London's top boutiques and department stores."
  },
  {
    icon: "💳",
    title: "You pay",
    body: "Simple upfront payment via Whish — quick and secure."
  },
  {
    icon: "📦",
    title: "We deliver",
    body: "10–14 working days, tracked, straight to your door."
  }
];

const POPULAR = [
  { icon: "👜", label: "Bags" },
  { icon: "👠", label: "Shoes" },
  { icon: "⌚", label: "Watches" },
  { icon: "💍", label: "Jewellery" },
  { icon: "💄", label: "Limited Edition Beauty" },
  { icon: "🎁", label: "Gift Sets" }
];

const FAQ = [
  {
    q: "Which brands can you source?",
    a: "Any brand available in London boutiques, including Selfridges, Harrods, Harvey Nichols and Liberty London."
  },
  {
    q: "How do I pay?",
    a: "Full payment upfront via Whish before we purchase your item."
  },
  {
    q: "What if the item is out of stock?",
    a: "Full refund, no questions asked."
  },
  {
    q: "Can I see the item before you ship?",
    a: "Yes — we send photos and confirmation before anything ships."
  }
];

export default function BespokePage() {
  const waHref = whatsappRequestLink();

  return (
    <div>
      {/* Hero */}
      <section style={{ backgroundColor: INK }}>
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: GOLD }}>
            Personal sourcing
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-cream sm:text-6xl">
            Your Personal Shopper in London
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-cream/70 sm:text-base">
            Bags, rare finds, limited editions, sold-out pieces — whatever you&apos;re after, tell us and we&apos;ll
            source it from London&apos;s finest boutiques and deliver it to your door.
          </p>
          <div className="mt-10">
            <a href={waHref} target="_blank" rel="noreferrer" className="btn-gold">
              Start Your Request
            </a>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cream/50">
              We typically respond within 2 hours
            </p>
          </div>
        </div>
      </section>

      {/* Chat with Béa — embedded AI consultant */}
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">AI consultant</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Chat with Béa, our AI consultant</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink/70">
            Tell Béa what you&apos;re looking for and she&apos;ll help shape your request — our team follows up on
            Instagram or by email within 2 hours.
          </p>
        </div>
        <div className="mt-8">
          <BespokeChat embedded />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">How it works</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Four simple steps</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="border border-ink/10 bg-cream p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-gold/20 text-xl">
                <span aria-hidden>{s.icon}</span>
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Step {i + 1}</p>
              <h3 className="mt-1 font-serif text-xl text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular requests */}
      <section className="border-t border-ink/10 bg-gold/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-accent">What people ask for</p>
            <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Popular requests</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {POPULAR.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center justify-center gap-3 border border-ink/10 bg-cream p-6 text-center"
              >
                <span className="text-3xl" aria-hidden>
                  {p.icon}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-ink">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial placeholder */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative border border-ink/10 bg-cream p-10 text-center shadow-soft">
          <span className="font-serif text-6xl leading-none text-gold" aria-hidden>
            &ldquo;
          </span>
          <p className="mt-2 font-serif text-xl text-ink/80">
            Your first happy customer&apos;s review goes here.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-ink/50">Seasons by B client</p>
        </div>
      </section>

      {/* Large CTA */}
      <section style={{ backgroundColor: INK }}>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl text-cream sm:text-4xl">Ready to find it?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-cream/70">
            Send us a message with what you&apos;re looking for. No request is too specific.
          </p>
          <div className="mt-10">
            <a href={waHref} target="_blank" rel="noreferrer" className="btn-gold">
              Start Your Request
            </a>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cream/50">
              We typically respond within 2 hours
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Good to know</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Frequently asked</h2>
        </div>
        <div className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {FAQ.map((item) => (
            <div key={item.q} className="py-6">
              <h3 className="font-serif text-lg text-ink">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-ink/10 pt-8 text-center">
          <Link href="/" className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-accent">
            ← Back to shop
          </Link>
        </div>
      </section>
    </div>
  );
}
