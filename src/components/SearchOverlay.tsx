import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/catalog";
import { useSearch } from "../store/search";
import { normalizeVi } from "../lib/text";
import { vnd } from "./ProductCard";

const BESTSELLER_LIMIT = 5;
const RESULT_LIMIT = 8;

export default function SearchOverlay() {
  const { open, setOpen } = useSearch();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const bestsellers = useMemo(
    () => [...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99)).slice(0, BESTSELLER_LIMIT),
    [],
  );

  const results = useMemo(() => {
    const q = normalizeVi(query.trim());
    if (!q) return bestsellers;
    return products.filter((p) => normalizeVi(p.name).includes(q)).slice(0, RESULT_LIMIT);
  }, [query, bestsellers]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--color-bg)]" onClick={() => setOpen(false)}>
      <div className="mx-auto max-w-[720px] px-5 py-10 md:px-8 md:py-16" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full border-b-2 edge bg-transparent py-2 font-serif text-2xl focus:border-ink focus:outline-none md:text-3xl"
          />
          <button onClick={() => setOpen(false)} aria-label="Close" className="shrink-0 text-ink hover:opacity-60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <p className="mt-8 text-xs tracking-[0.1em] text-ink-soft">
          {query.trim() ? "RESULTS" : "BESTSELLERS"}
        </p>
        <ul className="mt-3 divide-y divide-[var(--color-line)]">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                to={`/san-pham/${p.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-4 py-4 hover:opacity-70"
              >
                <span className="font-serif text-lg">{p.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-ink-soft">{vnd(p.price)}</span>
              </Link>
            </li>
          ))}
          {!results.length && (
            <li className="py-8 text-center text-sm text-ink-soft">No products match "{query}".</li>
          )}
        </ul>
      </div>
    </div>
  );
}
