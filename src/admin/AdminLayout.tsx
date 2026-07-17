import { useState, type ReactNode } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import LoginDrawer from "../components/LoginDrawer";

const NAV: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/admin", end: true, label: "Dashboard", icon: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /> },
  { to: "/admin/products", label: "Products", icon: <path d="M20 7L12 3 4 7v10l8 4 8-4V7zM12 3v18M4 7l8 4 8-4" /> },
  { to: "/admin/collections", label: "Collections", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { to: "/admin/orders", label: "Orders", icon: <path d="M6 2l1.5 3h9L18 2M4 8h16l-1 12H5L4 8zM9 12h6" /> },
  { to: "/admin/customers", label: "Customers", icon: <path d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" /> },
  { to: "/admin/size-rules", label: "Size Rules", icon: <path d="M3 8l4-4 14 14-4 4L3 8zM7 12l2-2M11 16l2-2" /> },
  { to: "/admin/reference", label: "SKU & Search", icon: <path d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3" /> },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, ready, setLoginOpen, logout } = useAuth();

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
            <span className="rounded bg-ink px-1.5 py-0.5 text-[9px] tracking-[0.15em] text-white">ADMIN</span>
          </Link>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-ink-soft">
          {ready && (isAdmin ? (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">{user?.email}</span>
              <button onClick={() => logout()} className="link-underline">Sign out</button>
            </span>
          ) : (
            <button onClick={() => setLoginOpen(true)} className="rounded bg-ink px-2.5 py-1 text-white">
              Sign in as admin
            </button>
          ))}
          <Link to="/" className="link-underline">← Storefront</Link>
        </div>
      </header>

      {/* read-only warning: RLS lets anyone READ the active catalogue, but every
          write is denied until the session carries the admin role. Say so up
          front instead of letting saves fail one by one. */}
      {ready && !isAdmin && (
        <div className="fixed inset-x-0 top-14 z-30 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] text-amber-800 lg:pl-56">
          {user
            ? `Signed in as ${user.email} — this account is not an admin. Data is read-only.`
            : "Not signed in — read-only. Drafts are hidden and every write is blocked by RLS."}
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
              {n.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-6 px-3 text-[10px] leading-relaxed text-ink-soft">
          Demo admin · backed by Postgres. Sign in as{" "}
          <span className="font-mono">admin / 123456</span> to write.
        </p>
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
