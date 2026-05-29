import Link from "next/link";
import { BeeMascot } from "@/components/BeeMascot";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <BeeMascot variant="floating" />
      <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-accent">404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Our bee got lost…</h1>
      <p className="mt-4 text-sm text-ink/70">Let&apos;s take you home 🐝</p>
      <Link href="/" className="btn-gold mt-8">
        Back to home
      </Link>
    </div>
  );
}
