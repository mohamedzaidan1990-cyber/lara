"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  src: string;
  /** Positioning wrapper classes (e.g. "absolute inset-0"). */
  wrapperClassName?: string;
  /** Classes for the <video> itself (sizing / object-fit). */
  videoClassName?: string;
  poster?: string;
  /** Turn the sound on automatically at the first user interaction. */
  soundOnInteract?: boolean;
  /** Which corner the sound toggle sits in. */
  buttonSide?: "left" | "right";
  /** Loop the film. When false it plays through once and stops. */
  loop?: boolean;
  label?: string;
}

const UNMUTE_EVENT = "autovideo-unmute";

// Autoplaying brand video. Muted autoplay is set at the DOM-property level
// (React's `muted` prop doesn't reliably set the property, which otherwise
// makes browsers block autoplay and show a play button). Sound can be enabled
// via the toggle or — when soundOnInteract is set — at the first user gesture.
// Only one AutoVideo plays sound at a time across the page.
export default function AutoVideo({
  src,
  wrapperClassName = "",
  videoClassName = "",
  poster,
  soundOnInteract = false,
  buttonSide = "right",
  loop = true,
  label = "Brand film"
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const id = useId();

  // Kick off playback. For the sound video, try to autoplay WITH sound first;
  // browsers usually block that until the user interacts, so on failure fall
  // back to muted autoplay (the interaction listener below unmutes on the first
  // tap/scroll). Other videos just autoplay muted.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (soundOnInteract) {
      v.muted = false;
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          setMuted(false);
          window.dispatchEvent(new CustomEvent(UNMUTE_EVENT, { detail: id }));
        }).catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        });
      }
    } else {
      v.muted = true;
      v.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enableSound() {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {});
    setMuted(false);
    window.dispatchEvent(new CustomEvent(UNMUTE_EVENT, { detail: id }));
  }

  function mute() {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    setMuted(true);
  }

  function toggle() {
    if (ref.current?.muted) enableSound();
    else mute();
  }

  // Pause the film (and its sound) once it scrolls out of view; resume only if
  // it hasn't already played through. So it plays while the viewer is on it and
  // stops the moment they scroll down the page.
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) {
          if (!v.ended) v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // When another video turns its sound on, mute this one.
  useEffect(() => {
    function onOther(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== id && ref.current && !ref.current.muted) mute();
    }
    window.addEventListener(UNMUTE_EVENT, onOther as EventListener);
    return () => window.removeEventListener(UNMUTE_EVENT, onOther as EventListener);
  }, [id]);

  // Unmute at the first user gesture anywhere on the page.
  useEffect(() => {
    if (!soundOnInteract) return;
    let done = false;
    const events = ["pointerdown", "touchstart", "keydown"];
    function go() {
      if (done) return;
      done = true;
      events.forEach((ev) => window.removeEventListener(ev, go));
      enableSound();
    }
    events.forEach((ev) => window.addEventListener(ev, go, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, go));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOnInteract]);

  return (
    <div className={"relative " + wrapperClassName}>
      <video
        ref={ref}
        className={videoClassName}
        src={src}
        poster={poster}
        autoPlay
        loop={loop}
        muted
        playsInline
        preload="auto"
        aria-label={label}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "Turn sound on" : "Mute"}
        className={
          "absolute bottom-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/35 text-white shadow-md backdrop-blur-sm transition hover:bg-ink/70 " +
          (buttonSide === "left" ? "left-2.5" : "right-2.5")
        }
      >
        {muted ? <MutedIcon /> : <SoundIcon />}
      </button>
    </div>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
