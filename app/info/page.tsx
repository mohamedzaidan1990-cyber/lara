import Link from "next/link";

export const metadata = {
  title: "How it works — Seasons by B",
  description: "Delivery, payment and returns policy for Seasons by B personal shopping."
};

const STEPS = [
  {
    icon: "🔎",
    title: "Search",
    body: "Browse the catalogue or message Seasons by B on WhatsApp with anything you'd like sourced from London."
  },
  {
    icon: "🛍",
    title: "Order",
    body: "Confirm the item and share your delivery details in under a minute."
  },
  {
    icon: "💳",
    title: "Pay",
    body: "Pay in full upfront via Whish or bank transfer. Send us the screenshot."
  },
  {
    icon: "📦",
    title: "Receive",
    body: "We buy in London and deliver to your door in 10–14 working days."
  }
];

export default function InfoPage() {
  const whish = process.env.WHISH_NUMBER ?? "";
  const bankIban = process.env.BANK_IBAN ?? "";
  const bankName = process.env.BANK_NAME ?? "";
  const accountHolder = process.env.ACCOUNT_HOLDER ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Information</p>
        <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">How Seasons by B works</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-ink/70">
          London&apos;s finest, delivered to your door.
        </p>
      </header>

      <section className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="border border-ink/10 bg-cream p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gold bg-gold/20 text-base">
              <span aria-hidden>{s.icon}</span>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-ink/60">Step {i + 1}</p>
            <h3 className="mt-1 font-serif text-xl text-ink">{s.title}</h3>
            <p className="mt-2 text-sm text-ink/70">{s.body}</p>
          </div>
        ))}
      </section>

      <Section title="Delivery">
        <p>10–14 working days door to door, anywhere we ship.</p>
        <p>You&apos;ll receive email and WhatsApp updates from order confirmation through to delivery.</p>
      </Section>

      <Section title="Payment">
        <p>Full payment is required upfront before we place your order.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-ink">Whish</strong> — send to {whish} ({accountHolder})
          </li>
          <li>
            <strong className="text-ink">Bank transfer</strong> — {bankName}, IBAN{" "}
            <span className="break-all">{bankIban}</span> ({accountHolder})
          </li>
        </ul>
        <p>Send us your payment screenshot via the order form or WhatsApp.</p>
      </Section>

      <Section title="Returns" id="returns">
        <p>
          <strong className="text-ink">Before shipment</strong> — full refund. Message us on WhatsApp and we&apos;ll
          cancel and refund.
        </p>
        <p>
          <strong className="text-ink">After delivery</strong> — 14 days to return, provided the item is unused with
          all original tags and packaging intact. The customer pays return shipping back to our address.
        </p>
        <p>
          <strong className="text-ink">Non-returnable</strong> — opened beauty products, fragrances, and
          personalised items.
        </p>
        <p>
          <strong className="text-ink">No exchanges</strong> — we issue refunds only.
        </p>
        <p className="text-ink/70">
          Note: certain brands are subject to their own return rules, which we will share at the point of order.
        </p>
      </Section>

      <Section title="Contact">
        <p>For anything else, reach Seasons by B directly on WhatsApp.</p>
        <a
          href="https://wa.me/96103055491"
          target="_blank"
          rel="noreferrer"
          className="btn-gold mt-2 w-fit"
        >
          Message on WhatsApp
        </a>
      </Section>

      <div className="mt-16 border-t border-ink/10 pt-8 text-center">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-accent">
          ← Back to shop
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  id,
  children
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 border-t border-ink/10 pt-10">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}
