import { useState, type ReactNode } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import LoginDrawer from "../components/LoginDrawer";
import { useTranslation } from "react-i18next";
import { useUnsavedGuard } from "./lib/unsavedGuard";
import { Btn } from "./components/ui";
import "./lib/i18n";

/** Language switcher is built and working but temporarily hidden per product
 *  decision — admin defaults to Vietnamese for now. Flip back on when ready. */
const SHOW_LANG_SWITCH = false;

interface NavItem { to: string; labelKey: string; icon: ReactNode; end?: boolean }
interface NavGroup { titleKey: string | null; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: null,
    items: [
      { to: "/admin", end: true, labelKey: "dashboard", icon: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /> },
      // { to: "/admin/analytics", labelKey: "analytics", icon: <><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></> },
    ],
  },
  {
    titleKey: "nav_group_products",
    items: [
      { to: "/admin/products", labelKey: "products", icon: <path d="M20 7L12 3 4 7v10l8 4 8-4V7zM12 3v18M4 7l8 4 8-4" /> },
      { to: "/admin/colors", labelKey: "colors", icon: <path d="M12 2a10 10 0 100 20 3 3 0 000-6h-1a2 2 0 010-4h1a3 3 0 000-6z" /> },
      { to: "/admin/sources", labelKey: "sources", icon: <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16V8z" /> },
      { to: "/admin/garment-types", labelKey: "garment_types", icon: <path d="M6 3h3l1.5 2h3L15 3h3l3 5-4 2v11H7V10L3 8l3-5z" /> },
      { to: "/admin/collections", labelKey: "collections", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
      { to: "/admin/categories", labelKey: "categories", icon: <path d="M3 14h6v6H3v-6zm0-10h6v6H3V4zm12 0h6v6h-6V4zm0 10h6v6h-6v-6z" /> },
      { to: "/admin/size-templates", labelKey: "Bảng size", icon: <path d="M2 12h20M7 7h.01M12 7h.01M17 7h.01M7 17h.01M12 17h.01M17 17h.01M2 7h20v10H2z" /> },
    ],
  },
  {
    titleKey: "nav_group_sales",
    items: [
      { to: "/admin/orders", labelKey: "orders", icon: <path d="M6 2l1.5 3h9L18 2M4 8h16l-1 12H5L4 8zM9 12h6" /> },
      { to: "/admin/customers", labelKey: "customers", icon: <path d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" /> },
      { to: "/admin/campaigns", labelKey: "campaigns", icon: <path d="M20.59 13.41L12 22l-9-9V4a1 1 0 011-1h8l9 9a2 2 0 010 2.82zM7 7h.01" /> },
    ],
  },
  {
    titleKey: "nav_group_content",
    items: [
      { to: "/admin/banners", labelKey: "banners", icon: <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 10h20M7 15h.01M12 15h5" /> },
      { to: "/admin/promotions", labelKey: "promotions", icon: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /> },
    ],
  },
  {
    titleKey: "nav_group_system",
    items: [
      { to: "/admin/settings", labelKey: "settings", icon: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
    ],
  },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, ready, setLoginOpen, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const requestLeave = useUnsavedGuard((s) => s.requestLeave);
  const pendingPath = useUnsavedGuard((s) => s.pendingPath);
  const onSaveDraft = useUnsavedGuard((s) => s.onSaveDraft);
  const disarm = useUnsavedGuard((s) => s.disarm);
  const clearPending = useUnsavedGuard((s) => s.clearPending);
  const [savingDraft, setSavingDraft] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-ink">
      {/* topbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b edge bg-[var(--color-bg)]/95 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo-ngang.svg" alt="FELIXXII" className="h-5 w-auto" />
            <span className="rounded bg-ink px-1.5 py-0.5 text-[12px] tracking-[0.15em] text-white">ADMIN</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-ink-soft">
          {/* Language switcher temporarily hidden — admin defaults to Vietnamese.
              Show both languages with the active one marked when re-enabled. A
              single "EN" label is ambiguous — it reads equally as "you are in
              English" or "switch to English". */}
          {SHOW_LANG_SWITCH && <div className="flex overflow-hidden rounded border edge" role="group" aria-label="Language">
            {(["en", "vi"] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => i18n.changeLanguage(lng)}
                aria-pressed={i18n.language === lng}
                className={`px-2 py-1 font-medium transition-colors ${
                  i18n.language === lng ? "bg-ink text-white" : "text-ink-soft hover:bg-[var(--color-tile)]"
                }`}
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>}
          {ready && (isAdmin ? (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">{user?.email}</span>
              <button onClick={() => logout()} className="link-underline">{t('sign_out')}</button>
            </span>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="rounded bg-ink px-2.5 py-1 text-white">
              {t('sign_in')}
            </button>
          ))}
          <Link to="/" className="link-underline">{t('storefront')}</Link>
        </div>
      </header>

      {/* read-only warning: RLS lets anyone READ the active catalogue, but every
          write is denied until the session carries the admin role. Say so up
          front instead of letting saves fail one by one. */}
      {ready && !isAdmin && (
        <div className="fixed inset-x-0 top-14 z-30 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[12px] text-amber-800 lg:pl-56">
          {user
            ? t('read_only_user', { email: user.email })
            : t('read_only_guest')}
        </div>
      )}

      {/* sidebar */}
      <aside className={`fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-56 overflow-y-auto border-r edge bg-[var(--color-bg)] px-3 py-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="space-y-4">
          {NAV_GROUPS.map((g, i) => (
            <div key={g.titleKey ?? `group-${i}`}>
              {g.titleKey && (
                <p className="mb-1 px-3 text-[11px] font-medium tracking-[0.1em] text-ink-soft/70">{t(g.titleKey)}</p>
              )}
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    onClick={(e) => {
                      if (!requestLeave(n.to)) { e.preventDefault(); return; }
                      setOpen(false);
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
                        isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-[var(--color-tile)] hover:text-ink"
                      }`
                    }
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
                    {t(n.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 top-14 z-20 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* content */}
      <main className={`lg:pl-56 ${ready && !isAdmin ? "pt-24" : "pt-14"}`}>
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>

      <LoginDrawer />

      {pendingPath && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={clearPending} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
            <h2 className="font-serif text-xl">{t("unsaved.title")}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t("unsaved.body")}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Btn
                disabled={savingDraft}
                onClick={async () => {
                  if (!onSaveDraft || !pendingPath) return;
                  setSavingDraft(true);
                  try {
                    await onSaveDraft(pendingPath);
                    disarm();
                  } catch {
                    // validation failed inside the form (e.g. a duplicate row) — the
                    // error is already shown there; just close this prompt and let
                    // the user fix it, don't discard the still-unsaved changes
                    clearPending();
                  } finally {
                    setSavingDraft(false);
                  }
                }}
              >
                {savingDraft ? t("common.saving") : t("unsaved.save_draft")}
              </Btn>
              <Btn
                variant="ghost"
                disabled={savingDraft}
                onClick={() => { const to = pendingPath; disarm(); navigate(to); }}
              >
                {t("unsaved.discard")}
              </Btn>
              <Btn variant="ghost" disabled={savingDraft} onClick={clearPending}>
                {t("unsaved.stay")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
