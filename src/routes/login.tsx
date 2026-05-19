import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const { signUp } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, fullName || email);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(mode === "signin" ? "Welcome back" : "Account created");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — animated brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-executive overflow-hidden">
        <FloatingShapes />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-white/10 backdrop-blur flex items-center justify-center">
              <span className="font-serif text-xl font-bold text-white">B</span>
            </div>
            <div>
              <p className="font-serif text-white text-lg font-semibold">Beacon BI</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Sector Intelligence</p>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-md"
        >
          <h2 className="font-serif text-5xl font-semibold text-white leading-[1.05] text-balance">
            Executive intelligence, delivered every week.
          </h2>
          <p className="mt-5 text-white/70 text-base leading-relaxed">
            A premium reporting platform built for sector analysts, corporate strategy and business
            development teams. Capture prospects, competitor intelligence and industry signals — all
            in one secure command center.
          </p>
          <div className="mt-8 flex gap-6 text-white/60 text-xs uppercase tracking-[0.18em]">
            <span>Health</span><span>Banking</span><span>Fintech</span><span>Extractive</span>
          </div>
        </motion.div>
        <p className="relative z-10 text-white/40 text-xs">© {new Date().getFullYear()} Beacon Intelligence. Confidential.</p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Secure access</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-navy">
            {mode === "signin" ? "Sign in to your workspace" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Continue to the reporting console." : "The first account becomes the administrator."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="form-input" placeholder="Alex Morgan" />
              </Field>
            )}
            <Field label="Work email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="form-input" placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="form-input" placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </Field>

            <button type="submit" disabled={busy}
              className="w-full h-11 rounded-md bg-gradient-navy text-white font-medium shadow-elegant hover:shadow-elevated transition-shadow flex items-center justify-center gap-2 disabled:opacity-70">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signin" ? (
              <>New to Beacon? <button onClick={() => setMode("signup")} className="text-royal hover:underline">Create an account</button></>
            ) : (
              <>Already have access? <button onClick={() => setMode("signin")} className="text-royal hover:underline">Sign in</button></>
            )}
          </div>

          <style>{`.form-input{width:100%;height:2.75rem;border:1px solid var(--border);border-radius:0.5rem;background:var(--background);padding:0 0.875rem;font-family:var(--font-serif);font-size:0.95rem;transition:border-color .2s, box-shadow .2s;outline:none}.form-input:focus{border-color:var(--royal);box-shadow:0 0 0 3px color-mix(in oklab,var(--royal) 18%, transparent)}`}</style>

          <p className="mt-10 text-[11px] text-center text-muted-foreground">
            By continuing you accept the internal acceptable use policy. <Link to="/dashboard" className="hover:underline">Back to home</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 280 + i * 80,
            height: 280 + i * 80,
            left: `${10 + i * 18}%`,
            top: `${15 + (i % 2) * 40}%`,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${0.06 - i * 0.01}) 0%, transparent 65%)`,
          }}
          animate={{ x: [0, 30, -10, 0], y: [0, -20, 10, 0] }}
          transition={{ duration: 14 + i * 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
    </div>
  );
}
