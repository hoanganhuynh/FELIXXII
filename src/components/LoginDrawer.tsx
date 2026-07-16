import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

type Step = "email" | "name";

export default function LoginDrawer() {
  const { loginOpen, setLoginOpen, login } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLoginOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLoginOpen]);

  useEffect(() => {
    if (!loginOpen) {
      const t = setTimeout(() => { setStep("email"); setEmail(""); setName(""); setPhone(""); }, 400);
      return () => clearTimeout(t);
    }
  }, [loginOpen]);

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("name");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    login({ name: name.trim() || email.split("@")[0], email, phone });
    navigate("/account");
  };

  const handleSocial = (provider: "google" | "facebook") => {
    const demos: Record<string, { name: string; email: string; phone: string }> = {
      google: { name: "Google User", email: "user@gmail.com", phone: "" },
      facebook: { name: "Facebook User", email: "user@facebook.com", phone: "" },
    };
    login(demos[provider]);
    navigate("/account");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/20 transition-opacity duration-300 ${loginOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setLoginOpen(false)}
      />
      <div
        className={`fixed right-0 top-0 z-[70] h-full w-full max-w-[420px] overflow-y-auto bg-[var(--color-bg)] shadow-2xl transition-transform duration-500 ease-[var(--ease-out-expo)] ${loginOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={() => setLoginOpen(false)}
          aria-label="Close"
          className="absolute right-5 top-5 text-ink transition-opacity hover:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="px-8 py-12">
          {step === "email" ? (
            <>
              <h2 className="font-serif text-lg">LOGIN / CREATE ACCOUNT</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Please enter your email address, and we'll check if you already have an account.
                You may also continue as a Guest.
              </p>
              <p className="mt-4 text-right text-[10px] text-ink-soft">*Required Fields</p>

              <form onSubmit={handleEmailContinue} className="mt-2">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Email Address*</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    autoComplete="email"
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-5 h-11 w-full bg-[#6b6b6b] text-white text-[11px] tracking-[0.12em] transition-opacity hover:opacity-90"
                >
                  CONTINUE
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 border-t edge" />
                <span className="text-xs text-ink-soft">OR</span>
                <div className="flex-1 border-t edge" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleSocial("google")}
                  className="flex h-11 w-full items-center justify-center gap-3 border edge text-[11px] tracking-[0.08em] transition-colors hover:bg-[var(--color-tile)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  CONTINUE WITH GOOGLE
                </button>
                <button
                  onClick={() => handleSocial("facebook")}
                  className="flex h-11 w-full items-center justify-center gap-3 border edge text-[11px] tracking-[0.08em] transition-colors hover:bg-[var(--color-tile)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  CONTINUE WITH FACEBOOK
                </button>
              </div>

              <div className="mt-8 border-t edge pt-6">
                <p className="text-[11px] font-medium tracking-[0.1em] text-ink-soft">TRACK MY ORDER</p>
              </div>

              <div className="mt-6 border-t edge pt-6">
                <p className="text-[11px] font-medium tracking-[0.1em]">
                  WISHLIST<sup className="ml-px text-[9px]">0</sup>
                </p>
                <p className="mt-4 text-xs text-ink-soft">You have nothing in your wishlist, yet.</p>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("email")}
                className="mb-8 flex items-center gap-2 text-xs text-ink-soft transition-opacity hover:opacity-70"
              >
                ← Back
              </button>
              <h2 className="font-serif text-lg">Welcome!</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                We didn't find an account for <strong>{email}</strong>.
                Enter your name to create one.
              </p>

              <form onSubmit={handleCreate} className="mt-7 space-y-4">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Full Name*</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Phone (optional)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0xx xxx xxxx"
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 h-11 w-full bg-ink text-white text-[11px] tracking-[0.12em] transition-opacity hover:opacity-85"
                >
                  CREATE ACCOUNT
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
