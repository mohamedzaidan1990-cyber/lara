import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import CartSidebar from "@/components/CartSidebar";
import BespokeChat from "@/components/BespokeChat";
import PromoCartWatcher from "@/components/PromoCartWatcher";
import CustomCursor from "@/components/CustomCursor";
import TitleCycler from "@/components/TitleCycler";
import PageFade from "@/components/PageFade";
import { INSTAGRAM_URL, INSTAGRAM_HANDLE, CONTACT_EMAIL, CONTACT_EMAIL_URL } from "@/lib/links";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.seasonsbyb.co.uk";
const SITE_TITLE = "Seasons by B — Luxury Beauty from London, Delivered to Lebanon";
const SITE_DESCRIPTION =
  "Shop authentic luxury beauty, makeup and skincare from London, delivered to your door in Lebanon in 10–14 days. Huda Beauty, Charlotte Tilbury, Dyson and 400+ brands.";

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
        url: "/og-card.jpg",
        width: 1200,
        height: 630,
        alt: "Seasons by B — London's Finest, Sweetly Delivered To Your Door"
      }
    ],
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-card.jpg"]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seasons by B"
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"]
  },
  category: "shopping",
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#e040a0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

// Sitewide structured data: tells Google who the business is and enables the
// sitelinks search box for brand queries ("seasons by b").
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "Seasons by B",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-card.jpg`,
  description: SITE_DESCRIPTION,
  email: "hello@seasonsbyb.co.uk",
  sameAs: ["https://instagram.com/seasons.by.b"],
  areaServed: { "@type": "Country", name: "Lebanon" },
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Seasons by B",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
        <CustomCursor />
        <TitleCycler />
        <SiteHeader />
        <main className="min-h-[60vh]">
          <PageFade>{children}</PageFade>
        </main>
        <SiteFooter />
        <CartSidebar />
        <BespokeChat />
        <PromoCartWatcher />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-accent/10 bg-white/70 backdrop-blur-sm text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Seasons by B" className="h-12 w-auto" width={460} height={188} />
          <p className="mt-3 text-sm text-ink/60">
            London&apos;s finest beauty, delivered with a pop of joy — to your door in 14 days.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Service</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink/70">
            <li>
              <Link href="/" className="transition-colors hover:text-accent">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/brands" className="transition-colors hover:text-accent">
                All Brands
              </Link>
            </li>
            <li>
              <Link href="/info" className="transition-colors hover:text-accent">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/track" className="transition-colors hover:text-accent">
                Track your order
              </Link>
            </li>
            <li>
              <Link href="/info#returns" className="transition-colors hover:text-accent">
                Returns policy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Delivery</p>
          <p className="mt-4 text-sm text-ink/70">10–14 working days door to door.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Contact</p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-accent/5 px-5 py-3 text-sm font-bold text-ink transition-all hover:bg-accent/10 hover:text-accent"
            >
              <InstagramIcon />
              {INSTAGRAM_HANDLE}
            </a>
            <a
              href={CONTACT_EMAIL_URL}
              className="inline-flex items-center gap-2 rounded-full bg-accent/5 px-5 py-3 text-sm font-bold text-ink transition-all hover:bg-accent/10 hover:text-accent"
            >
              <MailIcon />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-accent/10 bg-accent/5">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-accent/60 sm:px-6 lg:px-8">
          © 2026 Seasons by B. Curated with joy in London.
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
