"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BeeMascot } from "@/components/BeeMascot";
import BeeLoader from "@/components/BeeLoader";
import { productImageSrc } from "@/lib/images";
import { WHATSAPP_URL } from "@/lib/links";
import {
  SWATCH_ROWS,
  describeSkinTone,
  type BespokeRec,
  type Coverage,
  type Finish,
  type SkinType,
  type Undertone
} from "@/lib/shades";

interface CatalogMatch {
  id: string;
  brand: string;
  name: string;
  price_gbp: number;
  price_usd: number;
  deliverable_lebanon: boolean;
  product_url: string;
  image_url: string;
  matchPercent: number;
}

interface Results {
  skinToneDescription: string;
  catalogMatches: CatalogMatch[];
  bespokeRecommendations: BespokeRec[];
}

type Step = 1 | 2 | 3 | 4;

const fade = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 }
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ShadeFinderClient() {
  const [step, setStep] = useState<Step>(1);
  const [skinToneHex, setSkinToneHex] = useState<string | null>(null);
  const [undertone, setUndertone] = useState<Undertone | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [finish, setFinish] = useState<Finish | null>(null);

  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    if (!skinToneHex || !undertone || !coverage || !skinType || !finish) return;
    setStep(4);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shade-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinToneHex, undertone, coverage, skinType, finish })
      });
      if (!res.ok) throw new Error("Could not load your matches");
      setResults((await res.json()) as Results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep(1);
    setSkinToneHex(null);
    setUndertone(null);
    setCoverage(null);
    setSkinType(null);
    setFinish(null);
    setResults(null);
    setError(null);
  }

  return (
    <div className="min-h-[80vh]" style={{ backgroundColor: "#FFFDF5" }}>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {step > 1 ? <StepBar step={step} /> : null}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" variants={fade} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
              <Welcome onStart={() => setStep(2)} />
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div key="s2" variants={fade} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
              <SkinToneStep
                hex={skinToneHex}
                undertone={undertone}
                onHex={setSkinToneHex}
                onUndertone={setUndertone}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div key="s3" variants={fade} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
              <QuizStep
                coverage={coverage}
                skinType={skinType}
                finish={finish}
                setCoverage={setCoverage}
                setSkinType={setSkinType}
                setFinish={setFinish}
                onBack={() => setStep(2)}
                onReveal={reveal}
              />
            </motion.div>
          ) : null}

          {step === 4 ? (
            <motion.div key="s4" variants={fade} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.4 }}>
              <ResultsStep
                loading={loading}
                error={error}
                results={results}
                undertone={undertone}
                skinToneHex={skinToneHex}
                onRestart={restart}
                onRetry={reveal}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepBar({ step }: { step: Step }) {
  const pct = ((step - 1) / 3) * 100;
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-ink/50">
        <span>Tone</span>
        <span>Preferences</span>
        <span>Matches</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#F4D360" }} />
      </div>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <BeeMascot variant="floating" />
      <p className="mt-8 text-[11px] uppercase tracking-[0.32em] text-accent">Shade Finder</p>
      <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Find Your Perfect Shade</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink/70 sm:text-base">
        Answer a few questions and we&apos;ll match you to your ideal foundation and concealer from our London
        collection.
      </p>
      <button type="button" onClick={onStart} className="btn-primary mt-8 transition-transform hover:scale-[1.02]">
        Start My Consultation
      </button>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink/50">Takes 2 minutes</p>
    </div>
  );
}

const UNDERTONES: { value: Undertone; label: string; emoji: string }[] = [
  { value: "cool", label: "Cool", emoji: "🩵" },
  { value: "neutral", label: "Neutral", emoji: "🤍" },
  { value: "warm", label: "Warm", emoji: "🧡" }
];

function SkinToneStep({
  hex,
  undertone,
  onHex,
  onUndertone,
  onBack,
  onNext
}: {
  hex: string | null;
  undertone: Undertone | null;
  onHex: (h: string) => void;
  onUndertone: (u: Undertone) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl text-ink sm:text-4xl">Select your skin tone</h2>
      <p className="mt-2 text-sm text-ink/70">Choose the swatch that most closely matches your skin in natural daylight.</p>

      <div className="mt-8 space-y-5">
        {SWATCH_ROWS.map((row) => (
          <div key={row.label}>
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-ink/40">{row.label}</p>
            <div className="grid grid-cols-6 gap-3 sm:gap-4">
              {row.hexes.map((h) => {
                const selected = hex === h;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={`Skin tone ${h}`}
                    aria-pressed={selected}
                    onClick={() => onHex(h)}
                    className="mx-auto h-11 w-11 rounded-full transition-transform sm:h-14 sm:w-14"
                    style={{
                      backgroundColor: h,
                      transform: selected ? "scale(1.12)" : "scale(1)",
                      boxShadow: selected ? "0 0 0 3px #FFFDF5, 0 0 0 6px #F4D360" : "0 0 0 1px rgba(35,39,42,0.08)"
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <p className="text-sm font-medium text-ink">What&apos;s your undertone?</p>
        <p className="mt-1 text-xs text-ink/55">
          Not sure? Look at your wrist veins — blue/purple = cool, green = warm, both = neutral.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {UNDERTONES.map((u) => {
            const selected = undertone === u.value;
            return (
              <button
                key={u.value}
                type="button"
                onClick={() => onUndertone(u.value)}
                className={
                  "flex flex-col items-center gap-1 rounded-lg border px-3 py-4 text-sm transition-colors " +
                  (selected ? "border-gold bg-gold/15 text-ink" : "border-ink/15 bg-white text-ink/70 hover:border-gold/60")
                }
              >
                <span className="text-xl" aria-hidden>
                  {u.emoji}
                </span>
                {u.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent">
          ← Back
        </button>
        <button type="button" onClick={onNext} disabled={!hex || !undertone} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          Continue
        </button>
      </div>
    </div>
  );
}

interface QuizOption<T> {
  value: T;
  title: string;
  body: string;
}
const COVERAGE_OPTS: QuizOption<Coverage>[] = [
  { value: "light", title: "Light", body: "I want my skin to show through" },
  { value: "medium", title: "Medium", body: "Even coverage, natural finish" },
  { value: "full", title: "Full", body: "Complete coverage, flawless finish" }
];
const SKINTYPE_OPTS: QuizOption<SkinType>[] = [
  { value: "dry", title: "Dry", body: "I need hydration and glow" },
  { value: "normal", title: "Normal", body: "Balanced, no major concerns" },
  { value: "oily", title: "Oily", body: "I need matte and long-lasting" },
  { value: "combination", title: "Combination", body: "Oily T-zone, normal elsewhere" }
];
const FINISH_OPTS: QuizOption<Finish>[] = [
  { value: "dewy", title: "Dewy & luminous", body: "Lit-from-within radiance" },
  { value: "natural", title: "Natural & satin", body: "Soft, skin-like finish" },
  { value: "matte", title: "Matte & shine-free", body: "Velvety, no shine" }
];

function QuizStep({
  coverage,
  skinType,
  finish,
  setCoverage,
  setSkinType,
  setFinish,
  onBack,
  onReveal
}: {
  coverage: Coverage | null;
  skinType: SkinType | null;
  finish: Finish | null;
  setCoverage: (v: Coverage) => void;
  setSkinType: (v: SkinType) => void;
  setFinish: (v: Finish) => void;
  onBack: () => void;
  onReveal: () => void;
}) {
  const q2 = useRef<HTMLDivElement>(null);
  const q3 = useRef<HTMLDivElement>(null);
  const done = Boolean(coverage && skinType && finish);

  function scrollTo(ref: React.RefObject<HTMLDivElement>) {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

  return (
    <div>
      <h2 className="font-serif text-3xl text-ink sm:text-4xl">A few quick questions</h2>
      <p className="mt-2 text-sm text-ink/70">This helps us match the right formula, not just the colour.</p>

      <Question
        label="What coverage do you prefer?"
        options={COVERAGE_OPTS}
        value={coverage}
        onSelect={(v) => {
          setCoverage(v);
          scrollTo(q2);
        }}
      />
      <div ref={q2}>
        <Question
          label="What's your skin type?"
          options={SKINTYPE_OPTS}
          value={skinType}
          onSelect={(v) => {
            setSkinType(v);
            scrollTo(q3);
          }}
        />
      </div>
      <div ref={q3}>
        <Question label="What finish do you prefer?" options={FINISH_OPTS} value={finish} onSelect={setFinish} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent">
          ← Back
        </button>
        <button type="button" onClick={onReveal} disabled={!done} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
          Reveal my matches 🐝
        </button>
      </div>
    </div>
  );
}

function Question<T extends string>({
  label,
  options,
  value,
  onSelect
}: {
  label: string;
  options: QuizOption<T>[];
  value: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="mt-10">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              className={
                "rounded-lg border p-4 text-left transition-all " +
                (selected ? "border-gold bg-gold/15 shadow-soft" : "border-ink/15 bg-white hover:-translate-y-0.5 hover:border-gold/60")
              }
            >
              <p className="font-serif text-lg text-ink">{o.title}</p>
              <p className="mt-1 text-sm text-ink/65">{o.body}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultsStep({
  loading,
  error,
  results,
  undertone,
  skinToneHex,
  onRestart,
  onRetry
}: {
  loading: boolean;
  error: string | null;
  results: Results | null;
  undertone: Undertone | null;
  skinToneHex: string | null;
  onRestart: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="py-10">
        <BeeLoader fullScreen={false} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <BeeMascot variant="floating" />
        <p className="text-sm text-ink/70">{error}</p>
        <button type="button" onClick={onRetry} className="btn-gold">
          Try again
        </button>
      </div>
    );
  }
  if (!results) return null;

  const desc = results.skinToneDescription || (skinToneHex ? describeSkinTone(skinToneHex) : "");

  return (
    <div>
      <div className="text-center">
        <BeeMascot variant="success" />
        <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Your Perfect Matches 🐝</h2>
        <p className="mt-3 text-sm text-ink/70">
          Based on your <strong className="text-ink">{desc}</strong> skin with <strong className="text-ink">{undertone}</strong>{" "}
          undertones.
        </p>
        <div className="mt-5 flex justify-center">
          <ShareButton desc={desc} undertone={undertone} />
        </div>
      </div>

      {/* Section A — catalog */}
      <section className="mt-12">
        <h3 className="font-serif text-2xl text-ink">From our collection</h3>
        {results.catalogMatches.length === 0 ? (
          <p className="mt-4 rounded border border-ink/10 bg-ink/[0.02] p-6 text-sm text-ink/60">
            No direct catalogue matches right now — but your bespoke recommendations below are made for your shade.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
            {results.catalogMatches.map((m, i) => (
              <ResultCard key={m.id} match={m} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Section B — bespoke */}
      <section className="mt-14">
        <h3 className="font-serif text-2xl text-ink">Also recommended for your shade</h3>
        <p className="mt-1 text-sm text-ink/60">Hand-matched picks we can source for you on request.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {results.bespokeRecommendations.map((rec, i) => (
            <BespokeCard key={`${rec.brand}-${i}`} rec={rec} skinToneHex={skinToneHex} />
          ))}
        </div>
      </section>

      <div className="mt-14 text-center">
        <button type="button" onClick={onRestart} className="text-xs uppercase tracking-[0.2em] text-ink/50 hover:text-accent">
          ↺ Start over
        </button>
      </div>
    </div>
  );
}

function ResultCard({ match, index }: { match: CatalogMatch; index: number }) {
  const [failed, setFailed] = useState(false);
  const src = productImageSrc(match.image_url);
  const showImg = Boolean(src) && !failed;
  const orderHref =
    "/order?" +
    new URLSearchParams({
      brand: match.brand,
      name: match.name,
      gbp: String(match.price_gbp),
      usd: String(match.price_usd)
    }).toString();

  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05 }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink/[0.03]">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${match.brand} ${match.name}`} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-5xl" style={{ backgroundColor: "#FFFDF5", color: "#F4D360" }}>
            {(match.brand || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className="absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink"
          style={{ backgroundColor: "#F4D360" }}
        >
          {match.matchPercent}% match
        </span>
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-ink/60">{match.brand}</p>
      <p className="mt-1 line-clamp-2 text-sm text-ink">{match.name}</p>
      <p className="mt-2 font-serif text-lg text-ink">{formatUsd(match.price_usd)}</p>
      <Link href={orderHref} className="btn-primary mt-3 text-center text-xs">
        Order Now
      </Link>
    </motion.div>
  );
}

function BespokeCard({ rec, skinToneHex }: { rec: BespokeRec; skinToneHex: string | null }) {
  const message = `Hi Seasons by B, I'd like to request ${rec.brand} ${rec.productName}${
    rec.shadeName ? ` in shade ${rec.shadeName}` : ""
  }. My skin tone reference: ${skinToneHex ?? "(see Shade Finder)"}`;
  const wa = `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-col border border-ink/10 bg-white p-5">
      <p className="text-[11px] uppercase tracking-[0.24em] text-ink/60">{rec.brand}</p>
      <p className="mt-1 font-serif text-lg text-ink">{rec.productName}</p>
      {rec.shadeName ? (
        <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs text-ink">
          Shade: <strong>{rec.shadeName}</strong>
        </p>
      ) : null}
      {rec.shadeDescription ? <p className="mt-2 text-xs text-ink/55">{rec.shadeDescription}</p> : null}
      {rec.whyItWorks ? <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{rec.whyItWorks}</p> : <span className="flex-1" />}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-ink/50">{rec.priceRange}</span>
        <a href={wa} target="_blank" rel="noreferrer" className="text-xs uppercase tracking-[0.16em] text-accent hover:opacity-80">
          Request via Bespoke →
        </a>
      </div>
    </div>
  );
}

function ShareButton({ desc, undertone }: { desc: string; undertone: Undertone | null }) {
  const [copied, setCopied] = useState(false);
  const text = `I found my perfect shade match on Seasons by B! 🐝 My match: ${desc}${
    undertone ? ` with ${undertone} undertones` : ""
  }. Find yours: https://seasonsbyb.co.uk/shade-finder`;

  async function share() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My Seasons by B shade match", text, url: "https://seasonsbyb.co.uk/shade-finder" });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" onClick={share} className="btn-gold text-xs">
      {copied ? "Copied! ✓" : "Share My Results"}
    </button>
  );
}
