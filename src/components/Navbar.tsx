import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Dumbbell, LogOut, Moon, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import type { AppNotification, Role, Session } from "../types";
import { isReadBy, unreadCount, visibleNotifications } from "../lib/notifications";

export const panel = "rounded-2xl border border-border bg-card/70 backdrop-blur-sm";
export const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 active:scale-[0.98]";
export const btnPrimary = `${btn} bg-primary text-primary-foreground hover:brightness-110`;
export const btnGhost = `${btn} border border-border bg-secondary/50 text-foreground hover:bg-secondary`;
export const input =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground";

const STATUS_TONE: Record<string, string> = {
  Active: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "Expiring Soon": "border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-400",
  Expired: "border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400",
  Frozen: "border-sky-500/30 bg-sky-500/12 text-sky-600 dark:text-sky-400",
  Paid: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  Pending: "border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-400",
  Overdue: "border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400",
  Operational: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "Needs Service": "border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-400",
  "Out of Order": "border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400",
  Granted: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  Blocked: "border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-400",
};

const ICON_TONE: Record<string, string> = {
  primary: "bg-primary/12 text-primary",
  neutral: "bg-secondary text-muted-foreground",
  emerald: "bg-emerald-500/12 text-emerald-500",
  amber: "bg-amber-500/12 text-amber-500",
  rose: "bg-rose-500/12 text-rose-500",
  sky: "bg-sky-500/12 text-sky-500",
};

export function Pill({ children, tone = "Active" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[tone] ?? STATUS_TONE.Active}`}>{children}</span>;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">{title}</h2>
        {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string | number; hint?: string; icon: typeof Dumbbell; tone?: keyof typeof ICON_TONE }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${panel} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground md:text-4xl">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ICON_TONE[tone]}`}>
          <Icon size={17} strokeWidth={1.75} />
        </span>
      </div>
    </motion.div>
  );
}

export function EmptyState({ title, sub, icon: Icon = Dumbbell }: { title: string; sub?: string; icon?: typeof Dumbbell }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary/60 text-muted-foreground">
        <Icon size={20} strokeWidth={1.6} />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {sub ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={`${panel} w-full ${wide ? "max-w-3xl" : "max-w-lg"} bg-card p-5 shadow-2xl`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const ROLE_LABEL: Record<Role, string> = { admin: "Administrator", reception: "Receptionist", trainer: "Trainer", member: "Member" };

export default function Navbar({
  session,
  notifications,
  theme,
  onToggleTheme,
  onMarkRead,
  onLogout,
}: {
  session: Session;
  notifications: AppNotification[];
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onMarkRead: () => void;
  onLogout: () => void;
}) {
  const [openBell, setOpenBell] = useState(false);
  const visible = visibleNotifications(notifications, session);
  const unread = unreadCount(notifications, session);
  const initials = session.name.split(" ").map((p) => p[0]).join("").slice(0, 2);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell size={18} strokeWidth={2.4} />
          </span>
          <div className="leading-tight">
            <p className="font-display text-xl font-bold leading-none tracking-wide">FitCore</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">Gym management</p>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-xs font-semibold sm:flex">
          <ShieldCheck size={14} className="text-primary" />
          <span className="hidden sm:inline">{ROLE_LABEL[session.role]}</span>
        </div>

        <div className="relative ml-auto shrink-0 sm:ml-0">
          <button onClick={() => setOpenBell((v) => !v)} className={`${btnGhost} relative !p-2`} aria-label="Notifications">
            <Bell size={16} />
            {unread > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span> : null}
          </button>
          <AnimatePresence>
            {openBell ? (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`${panel} absolute right-0 top-11 z-50 w-80 bg-card p-2 shadow-2xl`}>
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-semibold text-muted-foreground">Notifications</p>
                  <button onClick={onMarkRead} className="text-[11px] font-semibold text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {visible.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">You are all caught up.</p> : null}
                  {visible.map((n) => (
                    <div key={n.id} className="flex gap-2 rounded-xl px-2 py-2 hover:bg-secondary/60">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isReadBy(n, session) ? "bg-muted-foreground/40" : "bg-primary"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{n.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <button onClick={onToggleTheme} className={`${btnGhost} shrink-0 !p-2`} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="hidden items-center gap-2 border-l border-border/70 pl-3 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[11px] font-bold text-foreground">{initials || <UserRound size={14} />}</span>
          <div className="leading-tight">
            <p className="text-xs font-semibold">{session.name}</p>
            <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[session.role]}</p>
          </div>
        </div>

        <button onClick={onLogout} className={`${btnGhost} shrink-0 !p-2`} aria-label="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}