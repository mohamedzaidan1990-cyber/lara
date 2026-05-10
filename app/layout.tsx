import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Lara — Your personal shopper in London",
  description:
    "Lara is a personal shopping service sourcing luxury pieces in London and delivering to Lebanon."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-white text-ink">
        <SiteHeader />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-serif text-3xl text-ink">Lara</span>
          <span className="mt-1 hidden text-[10px] uppercase tracking-[0.32em] text-ink/60 sm:block">
            Your personal shopper in London
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.18em] text-ink/70">
          <Link href="/" className="hover:text-gold">
            Shop
          </Link>
          <Link href="/info" className="hover:text-gold">
            How it works
          </Link>
          <a
            href="https://wa.me/96103055491"
            target="_blank"
            rel="noreferrer"
            className="hidden text-gold hover:opacity-80 sm:inline"
          >
            WhatsApp
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-serif text-2xl">Lara</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/60">
            Sourced in London. Delivered to Lebanon.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Service</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <Link href="/" className="hover:text-gold">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/info" className="hover:text-gold">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/info#returns" className="hover:text-gold">
                Returns policy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Delivery</p>
          <p className="mt-3 text-sm text-white/80">10–14 working days door to door.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Contact</p>
          <a
            href="https://wa.me/96103055491"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-white/80 hover:text-gold"
          >
            WhatsApp +961 03 055 491
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-[11px] uppercase tracking-[0.24em] text-white/50 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Lara Personal Shopping
        </div>
      </div>
    </footer>
  );
}
