import { useState, type ReactNode } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import LoginDrawer from "../components/LoginDrawer";
import { useTranslation } from "react-i18next";
import "./lib/i18n";

const NAV: { to: string; labelKey: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/admin", end: true, labelKey: "dashboard", icon: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /> },
  { to: "/admin/analytics", labelKey: "analytics", icon: <><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></> },
  { to: "/admin/products", labelKey: "products", icon: <path d="M20 7L12 3 4 7v10l8 4 8-4V7zM12 3v18M4 7l8 4 8-4" /> },
  { to: "/admin/collections", labelKey: "collections", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { to: "/admin/orders", labelKey: "orders", icon: <path d="M6 2l1.5 3h9L18 2M4 8h16l-1 12H5L4 8zM9 12h6" /> },
  { to: "/admin/customers", labelKey: "customers", icon: <path d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" /> },
  { to: "/admin/size-rules", labelKey: "size_rules", icon: <path d="M3 8l4-4 14 14-4 4L3 8zM7 12l2-2M11 16l2-2" /> },
  { to: "/admin/banners", labelKey: "banners", icon: <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM2 10h20M7 15h.01M12 15h5" /> },
  { to: "/admin/reference", labelKey: "reference", icon: <path d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3" /> },
  { to: "/admin/settings", labelKey: "settings", icon: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, ready, setLoginOpen, logout } = useAuth();
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-ink">
      {/* topbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b edge bg-[var(--color-bg)]/95 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo.svg" alt="FELIXXII" className="h-5 w-auto" />
            <span className="rounded bg-ink px-1.5 py-0.5 text-[12px] tracking-[0.15em] text-white">ADMIN</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-ink-soft">
          {/* Show both languages with the active one marked. A single "EN" label
              is ambiguous — it reads equally as "you are in English" or "switch
              to English". */}
          <div className="flex overflow-hidden rounded border edge" role="group" aria-label="Language">
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
          </div>
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
      <aside className={`fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-56 border-r edge bg-[var(--color-bg)] px-3 py-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
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
    </div>
  );
}
