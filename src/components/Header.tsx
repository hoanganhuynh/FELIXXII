import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCart, cartCount } from "../store/cart";
import { useBodyProfile } from "../store/bodyProfile";
import { useAuth } from "../store/auth";
import { CATEGORIES, COLLECTIONS } from "../data/catalog";

export default function Header() {
  const [menu, setMenu] = useState(false);
  const [colOpen, setColOpen] = useState(false);
  const count = useCart((s) => cartCount(s.lines));
  const openCart = useCart((s) => s.setOpen);
  const hasProfile = useBodyProfile((s) => !!s.measurements);
  const { user, setLoginOpen } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    setMenu(false);
    setColOpen(false);
  }, [pathname, search]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b edge bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto grid h-[62px] max-w-[1800px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
        {/* left nav — categories + collections entry */}
        <nav className="hidden items-center gap-6 lg:flex">
          {/* Collections (narrative) dropdown */}
          <div className="relative" onMouseEnter={() => setColOpen(true)} onMouseLeave={() => setColOpen(false)}>
            <button className="nav-link flex items-center gap-1">
              Collections
              <span className={`text-[9px] transition-transform ${colOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {colOpen && (
              <div className="absolute left-0 top-full w-72 border edge bg-[var(--color-bg)] p-2 shadow-xl">
                {COLLECTIONS.map((c) => (
                  <Link
                    key={c.id}
                    to={`/shop?collection=${c.id}`}
                    className="block rounded-sm px-3 py-2.5 transition-colors hover:bg-[var(--color-tile)]"
                  >
                    <span className="font-serif text-base">{c.label}</span>
                    <span className="ml-2 text-[10px] text-ink-soft">{c.season}</span>
                    <p className="mt-0.5 text-xs text-ink-soft">{c.note}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* Categories (utilitarian) */}
          {CATEGORIES.slice(0, 3).map((cat) => (
            <NavLink key={cat.id} to={`/shop?cat=${cat.id}`} className="nav-link">
              {cat.label}
            </NavLink>
          ))}
        </nav>

        {/* mobile menu btn */}
        <button className="flex flex-col gap-[5px] lg:hidden" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
          <span className={`h-px w-6 bg-ink transition-transform ${menu ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`h-px w-6 bg-ink transition-opacity ${menu ? "opacity-0" : ""}`} />
          <span className={`h-px w-6 bg-ink transition-transform ${menu ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </button>

        {/* wordmark */}
        <Link to="/" className="flex items-center justify-center" aria-label="SEN Atelier — home">
          <img src="/logo.svg" alt="SEN Atelier" className="h-6 md:h-7 w-auto" />
        </Link>

        {/* right */}
        <div className="flex items-center justify-end gap-4 md:gap-5">
          {CATEGORIES.slice(3).map((cat) => (
            <NavLink key={cat.id} to={`/shop?cat=${cat.id}`} className="nav-link hidden xl:block">
              {cat.label}
            </NavLink>
          ))}
          <button aria-label="Search" className="hidden text-ink transition-opacity hover:opacity-50 md:block">
            <Icon><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Icon>
          </button>
          <button
            aria-label={user ? "My Account" : "Sign In"}
            onClick={() => user ? navigate("/account") : setLoginOpen(true)}
            className="relative text-ink transition-opacity hover:opacity-50"
          >
            <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19.5a6.5 6.5 0 0113 0" /></Icon>
            {(user || hasProfile) && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />}
          </button>
          <button onClick={() => openCart(true)} aria-label="Cart" className="relative flex items-center gap-1.5 text-ink transition-opacity hover:opacity-50">
            <Icon><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></Icon>
            <span className="text-[0.8rem] tabular-nums">{count}</span>
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <div className={`overflow-hidden border-t edge bg-[var(--color-bg)] lg:hidden ${menu ? "max-h-[32rem]" : "max-h-0"} transition-[max-height] duration-500 ease-[var(--ease-out-expo)]`}>
        <nav className="flex flex-col px-6 py-4">
          <p className="label mt-2 text-ink-soft">Collections</p>
          {COLLECTIONS.map((c) => (
            <NavLink key={c.id} to={`/shop?collection=${c.id}`} className="py-2 font-serif text-lg">{c.label}</NavLink>
          ))}
          <p className="label mt-4 text-ink-soft">Categories</p>
          {CATEGORIES.map((cat) => (
            <NavLink key={cat.id} to={`/shop?cat=${cat.id}`} className="py-2 text-sm">{cat.label}</NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
