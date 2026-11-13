import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Dumbbell } from "lucide-react";

// Change the wording or the video files here. Put the files in public/videos/.
const HEADLINE = ["Run the floor", "Coach the room"];
const VIDEO_SRC = "/videos/hero.mp4";
const POSTER_SRC = "/videos/poster.jpg";

export default function LandingPage() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Some browsers ignore autoplay until asked; stay quiet if they refuse and let the poster show.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;
    video.muted = true;
    video.play().catch(() => undefined);
  }, [reduce]);

  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: "easeOut" as const } });

  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[#0f1012] text-white">
      {reduce ? (
        <img src={POSTER_SRC} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      ) : (
        <motion.div className="absolute inset-0 -z-20" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 10, ease: "easeOut" }}>
          <video ref={videoRef} className="h-full w-full object-cover" src={VIDEO_SRC} poster={POSTER_SRC} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
        </motion.div>
      )}
      <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to bottom, rgba(15,16,18,0.7) 0%, rgba(15,16,18,0.5) 50%, rgba(15,16,18,0.92) 100%)" }} />

      <header className="mx-auto flex w-full max-w-350 items-center justify-between px-4 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground"><Dumbbell size={19} strokeWidth={2.4} /></span>
          <span className="font-display text-2xl font-bold uppercase tracking-[0.3em]">FitCore</span>
        </Link>
        <Link to="/login" className="bg-[#d7263d] px-5 py-2 font-display text-base font-semibold uppercase tracking-wider text-white transition hover:bg-[#b81f33]">Sign in</Link>
      </header>

      <div className="mx-auto flex w-full max-w-350 flex-1 flex-col items-center justify-center px-4 pb-24 pt-8 text-center sm:px-8">
        <h1 className="font-headline text-4xl font-normal uppercase leading-[0.95] tracking-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl xl:text-8xl">
          <motion.span {...rise(0.2)} className="block text-[#d7263d]">{HEADLINE[0]}</motion.span>
          <motion.span {...rise(0.4)} className="mt-1 block text-[0.85em] text-white sm:mt-2">{HEADLINE[1]}</motion.span>
        </h1>
        <motion.div {...rise(0.7)} className="mt-10">
          <Link to="/login" className="inline-block border border-white/80 px-12 py-3.5 font-display text-lg font-semibold uppercase tracking-wider text-white transition hover:border-[#d7263d] hover:bg-[#d7263d]">Get started</Link>
        </motion.div>
      </div>
    </main>
  );
}
