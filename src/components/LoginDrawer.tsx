import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, purgeAuthStorage } from "../store/auth";

type Step = "email" | "password" | "signup";

/** Supabase Auth keys on email, so a bare username like "admin" gets the demo
 *  domain appended. Lets the demo creds stay "admin / 123456". */
const DEMO_DOMAIN = "felixxii.local";
const toEmail = (v: string) => {
  const t = v.trim();
  return t.includes("@") ? t : `${t}@${DEMO_DOMAIN}`;
};

export default function LoginDrawer() {
  const { loginOpen, setLoginOpen, signInWithEmail, signUpWithEmail } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /** Signing in from inside the admin should keep you there — bouncing to the
   *  storefront account page loses the admin's place. */
  const afterLogin = () => {
    if (!pathname.startsWith("/admin")) navigate("/account");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLoginOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLoginOpen]);

  useEffect(() => {
    if (!loginOpen) {
      const t = setTimeout(() => {
        setStep("email"); setIdent(""); setPassword(""); setName(""); setErr(null); setNote(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loginOpen]);

  const run = async (fn: () => Promise<void>, then?: () => void) => {
    setBusy(true); setErr(null);
    try {
      await fn();
      then?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onNext = (e: React.FormEvent) => { e.preventDefault(); setNote(null); setStep("password"); };
  const onSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => signInWithEmail(toEmail(ident), password), afterLogin);
  };
  const onSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => signUpWithEmail(toEmail(ident), password, name), afterLogin);
  };

  const fillDemo = (who: "user" | "admin") => {
    setIdent(who === "admin" ? "admin" : "user@gmail.com");
    setPassword("123456");
    setStep("password");
    setNote(null);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/20 transition-opacity duration-300 ${loginOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setLoginOpen(false)}
      />
      <div className={`fixed right-0 top-0 z-[70] h-full w-full max-w-[420px] overflow-y-auto bg-[var(--color-bg)] shadow-2xl transition-transform duration-500 ease-[var(--ease-out-expo)] ${loginOpen ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={() => setLoginOpen(false)} aria-label="Close" className="absolute right-5 top-5 text-ink transition-opacity hover:opacity-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="px-8 py-12">
          <h2 className="font-serif text-lg">LOGIN / CREATE ACCOUNT</h2>

          {err && (
            <div className="mt-4 rounded-md bg-[var(--color-accent-soft)] px-3 py-2.5">
              <p className="text-xs text-[var(--color-accent)]">{err}</p>
              {/* Escape hatch: a session written by an older DB generation can
                  wedge the client. One click drops it and reloads clean. */}
              <button
                onClick={() => { purgeAuthStorage(); window.location.reload(); }}
                className="mt-1.5 text-[10px] text-[var(--color-accent)] underline underline-offset-2"
              >
                Still stuck? Reset session and reload
              </button>
            </div>
          )}
          {note && <p className="mt-4 rounded-md bg-[var(--color-tile)] px-3 py-2 text-xs text-ink-soft">{note}</p>}

          {step === "email" && (
            <>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Please enter your email address, and we'll check if you already have an account.
              </p>
              <p className="mt-4 text-right text-[10px] text-ink-soft">*Required Fields</p>
              <form onSubmit={onNext} className="mt-2">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Email Address*</span>
                  <input
                    type="text"
                    required
                    value={ident}
                    onChange={(e) => setIdent(e.target.value)}
                    autoComplete="username"
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <button type="submit" className="mt-5 h-11 w-full bg-[#6b6b6b] text-[11px] tracking-[0.12em] text-white transition-opacity hover:opacity-90">
                  CONTINUE
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 border-t edge" /><span className="text-xs text-ink-soft">OR</span><div className="flex-1 border-t edge" />
              </div>

              <div className="space-y-3">
                <OAuthBtn provider="google" onClick={() => setNote("Social sign-in is decorative in this demo — it needs real provider credentials. Use email / password below.")} />
                <OAuthBtn provider="facebook" onClick={() => setNote("Social sign-in is decorative in this demo — it needs real provider credentials. Use email / password below.")} />
              </div>

              <DemoCreds onPick={fillDemo} />
            </>
          )}

          {step === "password" && (
            <>
              <button onClick={() => setStep("email")} className="mb-6 mt-6 flex items-center gap-2 text-xs text-ink-soft hover:opacity-70">← Back</button>
              <p className="text-xs text-ink-soft">Signing in as <strong className="text-ink">{toEmail(ident)}</strong></p>
              <form onSubmit={onSignIn} className="mt-5">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Password*</span>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus className="mt-1 w-full bg-transparent text-sm focus:outline-none" />
                </label>
                <button type="submit" disabled={busy} className="mt-5 h-11 w-full bg-ink text-[11px] tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40">
                  {busy ? "SIGNING IN…" : "SIGN IN"}
                </button>
              </form>
              <button onClick={() => setStep("signup")} className="mt-4 text-xs text-ink-soft underline underline-offset-2">
                No account yet? Create one
              </button>
            </>
          )}

          {step === "signup" && (
            <>
              <button onClick={() => setStep("password")} className="mb-6 mt-6 flex items-center gap-2 text-xs text-ink-soft hover:opacity-70">← Back</button>
              <p className="font-serif text-base">Create your account</p>
              <form onSubmit={onSignUp} className="mt-5 space-y-4">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Full Name*</span>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mt-1 w-full bg-transparent text-sm focus:outline-none" />
                </label>
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Email*</span>
                  <input type="email" required value={ident} onChange={(e) => setIdent(e.target.value)} className="mt-1 w-full bg-transparent text-sm focus:outline-none" />
                </label>
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Password* (min 6)</span>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="mt-1 w-full bg-transparent text-sm focus:outline-none" />
                </label>
                <button type="submit" disabled={busy} className="h-11 w-full bg-ink text-[11px] tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:opacity-40">
                  {busy ? "CREATING…" : "CREATE ACCOUNT"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Click-to-fill demo accounts — this is a shared test build, so make the
 *  credentials obvious rather than making people hunt for them. */
function DemoCreds({ onPick }: { onPick: (who: "user" | "admin") => void }) {
  return (
    <div className="mt-8 rounded-md border border-dashed edge p-4">
      <p className="text-[10px] tracking-[0.1em] text-ink-soft">DEMO ACCOUNTS — CLICK TO FILL</p>
      <div className="mt-3 space-y-2">
        <button onClick={() => onPick("user")} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-tile)]">
          <span className="text-xs">Customer</span>
          <span className="font-mono text-[10px] text-ink-soft">user@gmail.com · 123456</span>
        </button>
        <button onClick={() => onPick("admin")} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-tile)]">
          <span className="text-xs">Admin</span>
          <span className="font-mono text-[10px] text-ink-soft">admin · 123456</span>
        </button>
      </div>
    </div>
  );
}

function OAuthBtn({ provider, onClick }: { provider: "google" | "facebook"; onClick: () => void }) {
  const label = provider === "google" ? "CONTINUE WITH GOOGLE" : "CONTINUE WITH FACEBOOK";
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-3 border edge text-[11px] tracking-[0.08em] transition-colors hover:bg-[var(--color-tile)]"
    >
      {provider === "google" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {label}
    </button>
  );
}
