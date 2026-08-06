import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCart, cartCount } from "../store/cart";
import { useAuth } from "../store/auth";
import { useSearch } from "../store/search";
import { useProducts } from "../store/products";

const GARMENT_TYPES = ["Top", "Jacket", "Out-wear", "Shirt", "Skirt", "Dress", "Pants", "Gown"];

function useRotatingPlaceholder(items: string[], intervalMs = 2000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % items.length), intervalMs);
    return () => clearInterval(timer);
  }, [items.length, intervalMs]);
  return items[idx];
}

export default function Header() {
  const products = useProducts((s) => s.products);
  const [menu, setMenu] = useState(false);
  const [colOpen, setColOpen] = useState(false);
  const count = useCart((s) => cartCount(s.lines));
  const openCart = useCart((s) => s.setOpen);
  const { user, setLoginOpen } = useAuth();
  const openSearch = useSearch((s) => s.setOpen);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const searchHint = useRotatingPlaceholder(products.map((p) => p.name));

  useEffect(() => {
    setMenu(false);
    setColOpen(false);
  }, [pathname, search]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b edge bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto grid h-[62px] max-w-[1800px] grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
        {/* left nav — garment types + collection + bridal */}
        <nav className="hidden items-center gap-6 lg:flex">
          {/* Felixxii (garment types) dropdown */}
          <div className="relative" onMouseEnter={() => setColOpen(true)} onMouseLeave={() => setColOpen(false)}>
            <button className="nav-link flex items-center gap-1">
              Felixxii
              <span className={`text-[9px] transition-transform ${colOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {colOpen && (
              <div className="absolute left-0 top-full w-56 border edge bg-[var(--color-bg)] p-2 shadow-xl">
                {GARMENT_TYPES.map((g) => (
                  <Link
                    key={g}
                    to="/shop"
                    className="block rounded-sm px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-tile)]"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/shop" className="nav-link">Collection</NavLink>
          <NavLink to="/shop?cat=dam-bridal" className="nav-link">Bridal</NavLink>
        </nav>

        {/* mobile menu btn */}
        <button className="flex flex-col gap-[5px] lg:hidden" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
          <span className={`h-px w-6 bg-ink transition-transform ${menu ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`h-px w-6 bg-ink transition-opacity ${menu ? "opacity-0" : ""}`} />
          <span className={`h-px w-6 bg-ink transition-transform ${menu ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </button>

        {/* wordmark */}
        <Link to="/" className="flex items-center justify-center" aria-label="FELIXXII — home">
          <img src="/logo-ngang.svg" alt="FELIXXII" className="h-6 md:h-7 w-auto" />
        </Link>

        {/* right */}
        <div className="flex items-center justify-end gap-4 md:gap-5">
          <button aria-label="Search" onClick={() => openSearch(true)} className="flex items-center gap-2 text-ink transition-opacity hover:opacity-50">
            <Icon><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Icon>
            <span key={searchHint} className="hidden animate-[fade_0.4s_ease] text-[12px] text-ink-soft md:inline">
              {searchHint}
            </span>
          </button>
          <button
            aria-label={user ? "My Account" : "Sign In"}
            onClick={() => user ? navigate("/account") : setLoginOpen(true)}
            className="relative text-ink transition-opacity hover:opacity-50"
          >
            <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19.5a6.5 6.5 0 0113 0" /></Icon>
            {user && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />}
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
          <p className="label mt-2 text-ink-soft">Felixxii</p>
          {GARMENT_TYPES.map((g) => (
            <NavLink key={g} to="/shop" className="py-2 text-sm">{g}</NavLink>
          ))}
          <NavLink to="/shop" className="py-2 font-serif text-lg mt-2">Collection</NavLink>
          <NavLink to="/shop?cat=dam-bridal" className="py-2 font-serif text-lg">Bridal</NavLink>
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
