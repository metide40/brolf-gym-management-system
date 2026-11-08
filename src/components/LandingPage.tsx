import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, Dumbbell, QrCode, TrendingUp, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Change the wording or the video files here. Put the files in public/videos/.
const HEADLINE = ["Run the floor.", "Coach the room."];
const SUBTEXT = "FitCore brings memberships, QR check-in, classes, billing and equipment into one workspace, with a separate view for admins, reception, trainers and members.";
const VIDEO_SRC = "/videos/hero.mp4";
const POSTER_SRC = "/videos/poster.jpg";

const ROLES: { name: string; text: string }[] = [
  { name: "Administrator", text: "Full access to members, billing, equipment and gym settings." },
  { name: "Reception", text: "Front desk: check-in, member records, class bookings and dues." },
  { name: "Trainer", text: "Your roster, class schedule and workout programs." },
  { name: "Member", text: "Your pass, class bookings, programs and progress." },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Users, title: "Memberships and renewals", text: "Plans, expiry dates and automatic status, from active to expiring to expired." },
  { icon: QrCode, title: "QR check-in and check-out", text: "Scan a member's code at the door. Expired memberships and a full gym are stopped at the desk." },
  { icon: Calendar, title: "Classes and bookings", text: "Capacity limits, trainer and room clash checks, and a waitlist that fills seats automatically." },
  { icon: CreditCard, title: "Billing and invoices", text: "Record payments, print receipts, track what is overdue, and export to CSV." },
  { icon: Wrench, title: "Equipment upkeep", text: "See what is out of order and keep a maintenance history for every unit." },
  { icon: TrendingUp, title: "Progress and programs", text: "Members log measurements and goals, and follow the program their trainer builds." },
];

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
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5, ease: "easeOut" as const } };

  return (
    <div className="bg-background text-foreground">
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[#0f1012] text-white">
        {reduce ? (
          <img src={POSTER_SRC} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : (
          <motion.div className="absolute inset-0 -z-20" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 10, ease: "easeOut" }}>
            <video ref={videoRef} className="h-full w-full object-cover" src={VIDEO_SRC} poster={POSTER_SRC} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
          </motion.div>
        )}
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to bottom, rgba(15,16,18,0.6) 0%, rgba(15,16,18,0.25) 38%, rgba(15,16,18,0.92) 100%)" }} />
        <div className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to right, rgba(15,16,18,0.7) 0%, rgba(15,16,18,0) 65%)" }} />

        <header className="mx-auto flex w-full max-w-300 items-center justify-between px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Dumbbell size={17} strokeWidth={2.4} /></span>
            <span className="font-display text-2xl font-bold tracking-wide">FitCore</span>
          </Link>
          <Link to="/login" className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Sign in</Link>
        </header>

        <div className="mx-auto flex w-full max-w-300 flex-1 flex-col justify-end px-4 pb-14 pt-24 sm:px-6 sm:pb-20">
          <motion.p {...rise(0.1)} className="text-sm font-medium text-white/80">Gym management for the whole team</motion.p>
          <h1 className="mt-3 font-display text-6xl font-semibold leading-[0.95] sm:text-7xl lg:text-8xl xl:text-9xl">
            {HEADLINE.map((line, i) => (
              <motion.span key={line} {...rise(0.25 + i * 0.18)} className="block">{line}</motion.span>
            ))}
          </h1>
          <motion.p {...rise(0.7)} className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{SUBTEXT}</motion.p>
          <motion.div {...rise(0.85)} className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Sign in</Link>
            <a href="#features" className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">See what it does</a>
          </motion.div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-300 scroll-mt-4 px-4 py-16 sm:px-6 sm:py-24">
        <motion.div {...reveal}>
          <h2 className="font-display text-4xl font-semibold sm:text-5xl">One workspace for everyone on the team</h2>
          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div key={role.name} className="border-l-2 border-primary/60 pl-3">
                <dt className="text-sm font-semibold">{role.name}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{role.text}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div {...reveal} className="mt-16">
          <h2 className="font-display text-4xl font-semibold sm:text-5xl">What it handles</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon size={18} /></span>
                <p className="mt-4 text-base font-semibold">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...reveal} className="mt-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Try it with a demo account</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">This is a demo build. Sign-in is simulated and everything you do stays in your own browser, so you can explore each role freely.</p>
          <Link to="/login" className="mt-5 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Go to sign in</Link>
        </motion.div>
      </section>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-300 px-4 py-6 text-xs text-muted-foreground sm:px-6">FitCore, built for the Brolf Tech Remote Internship Challenge 2026.</p>
      </footer>
    </div>
  );
}
