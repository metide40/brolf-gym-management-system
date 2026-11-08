import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { AlertTriangle, Calendar, ClipboardList, CreditCard, Dumbbell, LayoutDashboard, Lock, Moon, QrCode, Settings as SettingsIcon, Sun, TrendingUp, UserCog, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as api from "./api/mockApi";
import { DEMO_ACCOUNTS } from "./mockData";
import type { BodyMeasurement, ClassInput, Database, FitnessGoal, MaintenanceInput, MemberInput, PaymentStatus, PlanName, Role, Session, TrainerInput, WorkoutPlan } from "./types";
import Navbar, { SidebarUser } from "./components/Navbar";
import { btnGhost, btnPrimary, input, panel } from "./components/Navbar";
import { AdminOverview, MemberDirectory, ReceptionTerminal, SettingsView } from "./components/AdminReceptionViews";
import { MemberClasses, MemberPass, MemberProgress, MemberWorkouts, TrainerView } from "./components/TrainerMemberViews";
import { ClassesBoard, EquipmentView, PaymentsView } from "./components/BillingEquipmentViews";
import { TrainersView } from "./components/TrainersView";
import LandingPage from "./components/LandingPage";

type TabKey = "overview" | "members" | "trainers" | "payments" | "equipment" | "settings" | "terminal" | "classes" | "roster" | "pass" | "workouts" | "progress";

type RouteItem = { path: string; key: TabKey; label: string; icon: LucideIcon };

// Every screen has its own URL: /<role>/<section>. The first entry is the role's home page.
const ROUTES: Record<Role, RouteItem[]> = {
  admin: [
    { path: "overview", key: "overview", label: "Overview", icon: LayoutDashboard },
    { path: "members", key: "members", label: "Members", icon: Users },
    { path: "trainers", key: "trainers", label: "Trainers", icon: UserCog },
    { path: "billing", key: "payments", label: "Billing", icon: CreditCard },
    { path: "classes", key: "classes", label: "Classes", icon: Calendar },
    { path: "equipment", key: "equipment", label: "Equipment", icon: Wrench },
    { path: "settings", key: "settings", label: "Settings", icon: SettingsIcon },
  ],
  reception: [
    { path: "check-in", key: "terminal", label: "Check-in", icon: QrCode },
    { path: "members", key: "members", label: "Members", icon: Users },
    { path: "classes", key: "classes", label: "Classes", icon: Calendar },
    { path: "billing", key: "payments", label: "Billing", icon: CreditCard },
  ],
  trainer: [
    { path: "roster", key: "roster", label: "My roster", icon: Users },
    { path: "schedule", key: "classes", label: "Schedule", icon: Calendar },
    { path: "equipment", key: "equipment", label: "Equipment", icon: Wrench },
  ],
  member: [
    { path: "pass", key: "pass", label: "My pass", icon: Dumbbell },
    { path: "classes", key: "classes", label: "Classes", icon: Calendar },
    { path: "programs", key: "workouts", label: "Programs", icon: ClipboardList },
    { path: "progress", key: "progress", label: "Progress", icon: TrendingUp },
  ],
};

const ROLE_LABEL: Record<Role, string> = { admin: "Administrator", reception: "Reception", trainer: "Trainer", member: "Member" };

const homeFor = (role: Role) => `/${role}/${ROUTES[role][0].path}`;

type WorkspaceProps = {
  session: Session | null;
  db: Database | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onMarkRead: () => void;
  onClearNotifications: () => void;
  onLogout: () => void;
  signedOutTo: string;
  renderSection: (key: TabKey) => ReactNode;
};

// Route guard + page shell. Anything under /<role>/<section> goes through here.
function Workspace({ session, db, theme, onToggleTheme, onMarkRead, onClearNotifications, onLogout, signedOutTo, renderSection }: WorkspaceProps) {
  const { role, section } = useParams();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // On phones the tab row scrolls sideways, so keep the active tab in view.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [location.pathname]);

  if (!session) return <Navigate to={signedOutTo} replace state={signedOutTo === "/login" ? { from: location.pathname } : undefined} />;

  const items = ROUTES[session.role];
  const current = role === session.role ? items.find((r) => r.path === section) : undefined;
  const denied = role !== session.role;

  if (!denied && !current) return <Navigate to={homeFor(session.role)} replace />;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Navbar session={session} notifications={db?.notifications ?? []} theme={theme} onToggleTheme={onToggleTheme} onMarkRead={onMarkRead} onClear={onClearNotifications} onLogout={onLogout} />
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-5 md:flex-row">
        <aside className="sticky top-16 z-30 -mx-4 bg-background px-4 py-2 md:top-20 md:z-auto md:mx-0 md:flex md:h-[calc(100dvh-6.5rem)] md:w-56 md:shrink-0 md:flex-col md:self-start md:overflow-y-auto md:bg-transparent md:px-0 md:py-0">
          <div className="relative">
          <nav ref={navRef} aria-label="Main" className="flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-col md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            {items.map((t) => {
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.path}
                  to={`/${session.role}/${t.path}`}
                  className={({ isActive }) =>
                    `flex shrink-0 snap-start items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition md:w-full ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
                  }
                >
                  <Icon size={16} strokeWidth={2} />
                  {t.label}
                </NavLink>
              );
            })}
          </nav>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:hidden" />
          </div>
          <SidebarUser session={session} onLogout={onLogout} />
        </aside>

        <main className="min-w-0 flex-1">
          {denied ? (
            <AccessDenied session={session} requested={role ?? ""} />
          ) : !db ? (
            <p className="text-sm text-muted-foreground">Workspace data could not be loaded. Open Settings and reset demo data, or refresh the page.</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {renderSection(current!.key)}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

function AccessDenied({ session, requested }: { session: Session; requested: string }) {
  return (
    <div className={`${panel} mx-auto mt-8 max-w-md p-6 text-center`}>
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-secondary text-muted-foreground"><Lock size={20} /></span>
      <h1 className="mt-4 font-display text-2xl font-semibold">No access to this area</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You are signed in as {ROLE_LABEL[session.role].toLowerCase()}, so the {requested || "requested"} area is not available. Sign out and use an account with the right role to open it.
      </p>
      <Link to={homeFor(session.role)} className={`${btnPrimary} mt-5`}>Back to my workspace</Link>
    </div>
  );
}

function NotFound({ session }: { session: Session | null }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4 text-foreground">
      <div className={`${panel} max-w-md p-6 text-center`}>
        <h1 className="font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That address does not match any page in FitCore.</p>
        <Link to={session ? homeFor(session.role) : "/login"} className={`${btnPrimary} mt-5`}>{session ? "Back to my workspace" : "Go to sign in"}</Link>
      </div>
    </div>
  );
}

function LoginRoute({ session, theme, onToggleTheme, onLogin }: { session: Session | null; theme: "dark" | "light"; onToggleTheme: () => void; onLogin: (email: string, password: string) => Promise<void> }) {
  const location = useLocation();
  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith(`/${session.role}/`) ? from : homeFor(session.role)} replace />;
  }
  return <LoginScreen onLogin={onLogin} theme={theme} onToggleTheme={onToggleTheme} />;
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("fitcore.theme") === "light" ? "light" : "dark"));
  const [db, setDb] = useState<Database | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [booted, setBooted] = useState(false);
  // After an explicit sign-out, send the visitor to the landing page. Deep links while signed out still go to /login.
  const justSignedOut = useRef(false);
  const [tests, setTests] = useState<{ name: string; passed: boolean; detail: string }[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("fitcore.theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.loadDatabase();
        if (active) setDb(data);
      } catch {
        toast.error("Unable to load workspace data. Try resetting demo data.");
      }
      if (active) {
        setSession(api.getSession());
        setBooted(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const next = await api.login(email, password);
    justSignedOut.current = false;
    setSession(next);
    toast.success(`Signed in as ${next.name}`);
  };

  const handleLogout = async () => {
    justSignedOut.current = true;
    await api.logout();
    setSession(null);
  };

  const mutate = async (fn: () => Promise<Database>, message?: string) => {
    try {
      const next = await fn();
      setDb(next);
      if (message) toast.success(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  // Like mutate, but reports whether it worked so forms know whether to close.
  const mutateOk = async (fn: () => Promise<Database>, message: string): Promise<boolean> => {
    try {
      setDb(await fn());
      toast.success(message);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    }
  };

  const handleCancelClass = async (classId: string): Promise<boolean> => {
    try {
      const result = await api.cancelClass(classId);
      setDb(result.db);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      return result.ok;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel the class.");
      return false;
    }
  };

  const handleCheckIn = async (code: string) => {
    try {
      const result = await api.checkIn(code);
      setDb(result.db);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      return { ok: result.ok, message: result.message };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Check-in failed.";
      toast.error(message);
      return { ok: false, message };
    }
  };

  const handleCheckOut = async (code: string) => {
    try {
      const result = await api.checkOut(code);
      setDb(result.db);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      return { ok: result.ok, message: result.message };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Check-out failed.";
      toast.error(message);
      return { ok: false, message };
    }
  };

  const handleBook = async (classId: string, memberId: string) => {
    try {
      const result = await api.bookClass(classId, memberId);
      setDb(result.db);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      return { ok: result.ok, message: result.message };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Booking failed.";
      toast.error(message);
      return { ok: false, message };
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const result = await api.cancelBooking(bookingId);
      setDb(result.db);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      return { ok: result.ok, message: result.message };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cancellation failed.";
      toast.error(message);
      return { ok: false, message };
    }
  };

  const runTests = async () => {
    setRunningTests(true);
    try {
      const results = await api.runTestSuite();
      setTests(results);
      const passed = results.filter((r) => r.passed).length;
      if (passed === results.length) toast.success(`All ${results.length} business rules passing`);
      else toast.error(`${results.length - passed} business rule check(s) failing`);
    } catch {
      toast.error("Test suite could not run.");
    } finally {
      setRunningTests(false);
    }
  };

  const activeMemberId = session?.memberId ?? db?.members[0]?.id ?? "";

  const renderSection = (tab: TabKey) => {
    if (!session || !db) return null;
    switch (tab) {
      case "overview":
        return <AdminOverview db={db} />;
      case "members":
        return (
          <MemberDirectory
            db={db}
            onSave={(member: MemberInput) => mutate(() => api.saveMember(member), "Member record saved")}
            onDelete={(id: string) => mutate(() => api.deleteMember(id), "Member removed")}
            onFreeze={(id: string) => mutate(() => api.toggleMemberFreeze(id), "Membership status updated")}
            onRenew={(id: string, days: number) => mutate(() => api.renewMembership(id, days), `Membership extended by ${days} days`)}
          />
        );
      case "trainers":
        return (
          <TrainersView
            db={db}
            onSave={(t: TrainerInput) => mutateOk(() => api.saveTrainer(t), t.id ? "Trainer updated" : "Trainer added")}
            onDelete={(id: string) => mutateOk(() => api.deleteTrainer(id), "Trainer removed")}
          />
        );
      case "terminal":
        return <ReceptionTerminal db={db} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />;
      case "classes":
        return session.role === "member" ? (
          <MemberClasses
            db={db}
            memberId={activeMemberId}
            onBook={handleBook}
            onCancel={handleCancel}
            onLeaveWaitlist={(id: string) => mutate(() => api.leaveWaitlist(id), "Left the waitlist")}
          />
        ) : (
          <ClassesBoard
            db={db}
            onBook={handleBook}
            onCancel={handleCancel}
            onCheckIn={handleCheckIn}
            canManage={session.role === "admin" || session.role === "reception"}
            onSaveClass={(c: ClassInput) => mutateOk(() => api.saveClass(c), c.id ? "Class updated" : "Class created")}
            onCancelClass={handleCancelClass}
          />
        );
      case "payments":
        return <PaymentsView db={db} onLogPayment={(p: { memberId: string; plan: PlanName; amount: number; method: string; status: PaymentStatus }) => mutate(() => api.addPayment(p), "Payment recorded")} />;
      case "equipment":
        return (
          <EquipmentView
            db={db}
            onCycle={(id: string) => mutate(() => api.cycleEquipmentStatus(id), "Equipment status advanced")}
            onLog={(id: string, value: MaintenanceInput) => mutateOk(() => api.logMaintenance(id, value), "Maintenance logged")}
          />
        );
      case "settings":
        return <SettingsView db={db} onSave={(settings) => mutate(() => api.updateSettings(settings), "Settings saved")} onReset={() => mutate(api.resetDemoData, "Demo data restored")} onRunTests={runTests} testResults={tests} running={runningTests} />;
      case "roster":
        return (
          <TrainerView
            db={db}
            trainerId={session.trainerId ?? "TR-01"}
            onCheckIn={handleCheckIn}
            onSavePlan={(plan: WorkoutPlan) => mutate(() => api.saveWorkoutPlan(plan), "Program published")}
          />
        );
      case "pass":
        return <MemberPass db={db} memberId={activeMemberId} onRenew={(id: string, days: number) => mutate(() => api.renewMembership(id, days), `Membership extended by ${days} days`)} />;
      case "workouts":
        return <MemberWorkouts db={db} memberId={activeMemberId} onToggleExercise={(planId: string, exerciseId: string) => mutate(() => api.toggleExercise(planId, exerciseId))} />;
      case "progress":
        return (
          <MemberProgress
            db={db}
            memberId={activeMemberId}
            onAddMeasurement={(m: Omit<BodyMeasurement, "id">) => mutate(() => api.addMeasurement(m), "Measurement logged")}
            onSaveGoal={(g: FitnessGoal) => mutate(() => api.saveGoal(g))}
          />
        );
      default:
        return null;
    }
  };

  if (!booted) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 animate-pulse place-items-center rounded-lg bg-primary/15 text-primary"><Dumbbell size={22} /></span>
          <p className="text-sm font-medium text-muted-foreground">Loading FitCore...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" theme={theme} closeButton />
      <Routes>
        <Route path="/" element={session ? <Navigate to={homeFor(session.role)} replace /> : <LandingPage />} />
        <Route path="/login" element={<LoginRoute session={session} theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} onLogin={handleLogin} />} />
        <Route
          path="/:role/:section"
          element={
            <Workspace
              session={session}
              db={db}
              theme={theme}
              onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
              onMarkRead={() => { if (session) void mutate(() => api.markNotificationsRead(session)); }}
              onClearNotifications={() => { if (session) void mutate(() => api.clearNotifications(session)); }}
              onLogout={handleLogout}
              signedOutTo={justSignedOut.current ? "/" : "/login"}
              renderSection={renderSection}
            />
          }
        />
        <Route path="*" element={<NotFound session={session} />} />
      </Routes>
    </>
  );
}

function LoginScreen({ onLogin, theme, onToggleTheme }: { onLogin: (email: string, password: string) => Promise<void>; theme: "dark" | "light"; onToggleTheme: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (nextEmail = email, nextPassword = password) => {
    if (!nextEmail.trim() || !nextPassword) {
      setError("Enter both your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onLogin(nextEmail, nextPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
      setBusy(false);
    }
  };

  const signInAs = (idx: number) => {
    const account = DEMO_ACCOUNTS[idx];
    setEmail(account.email);
    setPassword(account.password);
    submit(account.email, account.password);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" aria-label="FitCore home" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Dumbbell size={17} strokeWidth={2.4} /></span>
          <span className="font-display text-2xl font-bold tracking-wide">FitCore</span>
        </Link>
        <button onClick={onToggleTheme} className={`${btnGhost} shrink-0 !p-2`} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2">
        <div className="w-full max-w-md">
          <div className={`${panel} bg-card p-6 sm:p-8`}>
            <h1 className="font-display text-3xl font-semibold">Sign in</h1>

            <form
              className="mt-5 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="text-sm font-medium text-muted-foreground">Email<input type="email" autoComplete="username" className={`${input} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fitcore.demo" /></label>
              <label className="text-sm font-medium text-muted-foreground">Password<input type="password" autoComplete="current-password" className={`${input} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              {error ? (
                <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className={`${btnPrimary} mt-1 w-full`}>{busy ? "Signing in..." : "Sign in"}</button>
            </form>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-semibold">Demo accounts</p>
              <p className="mt-1 text-xs text-muted-foreground">This is a demo build. Accounts are simulated and data stays in this browser. Password for all: fitcore123</p>
              <div className="mt-3 grid gap-1.5">
                {DEMO_ACCOUNTS.map((a, i) => (
                  <button key={a.role} onClick={() => signInAs(i)} disabled={busy} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-secondary/60 disabled:opacity-50">
                    <span className="font-semibold">{a.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{a.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
