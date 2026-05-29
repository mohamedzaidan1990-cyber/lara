import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CartSidebar from "@/components/CartSidebar";
import BespokeChat from "@/components/BespokeChat";
import CustomCursor from "@/components/CustomCursor";
import TitleCycler from "@/components/TitleCycler";
import PageFade from "@/components/PageFade";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seasonsbyb.co.uk";
const SITE_TITLE = "Seasons by B — London's Finest, Delivered to Your Door";
const SITE_DESCRIPTION =
  "Shop luxury beauty and skincare from London, delivered to your door. Personal shopping and bespoke sourcing for bags, rare finds and limited editions.";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Seasons by B"
  },
  description: SITE_DESCRIPTION,
  applicationName: "Seasons by B",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Seasons by B",
    images: [
      {
        url: "/icons/icon-512.svg",
        width: 512,
        height: 512,
        alt: "Seasons by B"
      }
    ],
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/icons/icon-512.svg"]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seasons by B"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/icon-512.svg" }],
    shortcut: ["/icons/icon-192.svg"]
  },
  category: "shopping",
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#F4D360",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-cream text-ink">
        <CustomCursor />
        <TitleCycler />
        <SiteHeader />
        <main className="min-h-[60vh]">
          <PageFade>{children}</PageFade>
        </main>
        <SiteFooter />
        <CartSidebar />
        <BespokeChat />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-serif text-2xl text-gold">Seasons by B</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cream/60">
            London&apos;s finest, delivered to your door
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Service</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
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
              <Link href="/track" className="hover:text-gold">
                Track your order
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
          <p className="mt-3 text-sm text-cream/80">10–14 working days door to door.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Contact</p>
          <a
            href="https://wa.me/96103055491"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm text-cream/80 hover:text-gold"
          >
            <WhatsAppIcon />
            WhatsApp +961 03 055 491
          </a>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-[11px] uppercase tracking-[0.24em] text-cream/50 sm:px-6 lg:px-8">
          © 2025 Seasons by B. London.
        </div>
      </div>
    </footer>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.13 1.6 5.93L0 24l6.36-1.67a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.42-8.42ZM12.06 21.6h-.01a9.7 9.7 0 0 1-4.95-1.36l-.36-.21-3.78.99 1.01-3.68-.24-.38a9.69 9.69 0 0 1-1.49-5.18c0-5.36 4.37-9.73 9.74-9.73 2.6 0 5.04 1.01 6.88 2.85a9.66 9.66 0 0 1 2.86 6.88c0 5.36-4.37 9.73-9.66 9.73Zm5.59-7.29c-.31-.16-1.81-.89-2.09-.99-.28-.1-.49-.16-.69.16-.21.31-.79.99-.97 1.2-.18.21-.36.23-.66.08-.31-.16-1.29-.48-2.46-1.51-.91-.81-1.52-1.81-1.7-2.12-.18-.31-.02-.48.13-.63.13-.13.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.69-1.66-.95-2.27-.25-.6-.5-.52-.69-.53l-.59-.01c-.21 0-.55.08-.83.39-.28.31-1.09 1.06-1.09 2.59 0 1.53 1.12 3.01 1.27 3.22.16.21 2.2 3.36 5.33 4.71 1.86.8 2.59.87 3.52.74.56-.08 1.81-.74 2.07-1.46.26-.72.26-1.34.18-1.46-.08-.13-.28-.21-.59-.36Z" />
    </svg>
  );
}
