import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useCart, cartTotal, cartCount } from "../store/cart";
import { products, productById, accessoryById } from "../data/catalog";
import ProductCard, { vnd } from "./ProductCard";
import ProductImage from "./ProductImage";

export default function CartDrawer() {
  const { lines, open, setOpen, remove, setQty } = useCart();
  const total = cartTotal(lines);
  const count = cartCount(lines);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--color-bg)]">
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center bg-[var(--color-bg)] px-5 py-6 md:px-8">
        <span />
        <div className="flex items-center gap-8">
          <button className="text-sm">CART<sup className="ml-0.5 align-super text-[10px]">{count}</sup></button>
          <button className="text-sm text-ink-soft">WISHLIST<sup className="ml-0.5 align-super text-[10px]">0</sup></button>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="justify-self-end text-ink hover:opacity-60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-8">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-32 text-center">
            <p className="font-serif text-2xl">Your cart is empty.</p>
            <button onClick={() => setOpen(false)} className="link-underline text-sm">Continue shopping →</button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            <div>
              {lines.map((l) => {
                const src = productById(l.id) ?? accessoryById(l.id);
                return (
                <div key={l.key} className="grid grid-cols-[100px_1fr_auto] gap-5 border-b edge py-8">
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-[var(--color-tile)]">
                    {src && <ProductImage item={src} className="h-full w-full" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-[15px]">{l.name}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {l.colorName && <>Color: {l.colorName}</>}
                      {l.size && <> · Size: {l.size}</>}
                    </p>
                    <p className="mt-1 font-serif text-[13px]">{vnd(l.price)}</p>
                    <div className="mt-4 flex items-center gap-6">
                      <div className="flex items-center gap-3 border edge px-2.5 py-1 text-sm">
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease">–</button>
                        <span className="w-5 text-center tabular-nums">{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase">+</button>
                      </div>
                      <button onClick={() => remove(l.key)} className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink">Remove</button>
                    </div>
                  </div>
                  <button aria-label="Save" className="h-4 text-ink-soft hover:text-ink">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
                  </button>
                </div>
                );
              })}
            </div>

            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <dl className="space-y-2 text-[13px]">
                <Row k="Subtotal" v={vnd(total)} />
                <Row k="Shipping" v="FREE" />
                <Row k="Taxes" v="CALCULATED AT CHECKOUT" muted />
                <div className="my-3 border-t edge" />
                <Row k="Total" v={vnd(total)} bold />
              </dl>
              <button className="mt-6 h-12 w-full rounded-lg bg-ink text-white transition-opacity hover:opacity-85">
                <span className="label text-white">CHECKOUT — {vnd(total)}</span>
              </button>
              <button onClick={() => setOpen(false)} className="mt-3 h-12 w-full rounded-lg border edge text-xs tracking-[0.02em] transition-colors hover:bg-[var(--color-tile)]">
                CONTINUE SHOPPING
              </button>
              <div className="mt-8">
                <Acc title="Shipping & Returns">
                  <p>Free nationwide shipping. Processed & delivered in 5–7 business days. Returns accepted within 7 days.</p>
                </Acc>
                <Acc title="0% Financing & Payments">
                  <p>Split your purchase with 0% installment plans, or use card / e-wallet / transfer.</p>
                </Acc>
              </div>
            </aside>
          </div>
        )}

        <section className="mt-24">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-serif text-2xl">Bestsellers this week</h2>
            <Link to="/shop" onClick={() => setOpen(false)} className="text-xs underline underline-offset-2">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {[...products].sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99)).slice(0, 4).map((p, i) => (
              <div key={p.id} onClick={() => setOpen(false)}>
                <ProductCard item={p} index={i} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ k, v, muted, bold }: { k: string; v: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={bold ? "" : "text-ink-soft"}>{k}</dt>
      <dd className={`text-right tabular-nums ${muted ? "text-[11px] text-ink-soft" : ""} ${bold ? "font-serif text-base" : ""}`}>{v}</dd>
    </div>
  );
}

function Acc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t edge py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.02em]">
        {title}
        <span className="text-ink-soft transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-xs leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}
