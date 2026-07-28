import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart, cartTotal, cartCount } from "../store/cart";
import { products, productById } from "../data/catalog";
import ProductCard, { vnd } from "./ProductCard";
import ProductImage from "./ProductImage";

export default function CartDrawer() {
  const { lines, open, setOpen, remove, setQty } = useCart();
  const [tab, setTab] = useState<"cart" | "wishlist">("cart");
  const total = cartTotal(lines);
  const count = cartCount(lines);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--color-bg)]">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-bg)] px-5 py-4 md:px-8">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setTab("cart")}
            className={`flex items-center gap-1.5 rounded px-3 py-2 text-[13px] tracking-[0.05em] transition-colors ${
              tab === "cart" ? "bg-[var(--color-tile-deep)] text-ink" : "text-ink-soft"
            }`}
          >
            CART
            <span className="text-[11px]">({count})</span>
          </button>
          <button
            onClick={() => setTab("wishlist")}
            className={`flex items-center gap-1.5 rounded px-3 py-2 text-[13px] tracking-[0.05em] transition-colors ${
              tab === "wishlist" ? "bg-[var(--color-tile-deep)] text-ink" : "text-ink-soft"
            }`}
          >
            WISHLIST
            <span className="text-[11px]">(0)</span>
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors md:right-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {tab === "cart" && (
        <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-8 md:px-8">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-32 text-center">
              <p className="font-serif text-2xl">Your cart is empty.</p>
              <button onClick={() => setOpen(false)} className="link-underline text-sm">
                Continue shopping →
              </button>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
              {/* Cart items */}
              <div className="space-y-6">
                {lines.map((l) => {
                  const src = productById(l.id);
                  return (
                    <div key={l.key} className="flex gap-6 border-b border-[var(--color-line)] pb-6">
                      {/* Product image */}
                      <Link
                        to={`/san-pham/${l.id}`}
                        onClick={() => setOpen(false)}
                        className="aspect-[3/4] w-[120px] shrink-0 overflow-hidden bg-[var(--color-tile)] md:w-[160px]"
                      >
                        {src && <ProductImage item={src} className="h-full w-full object-cover object-top" />}
                      </Link>

                      {/* Item info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <p className="font-serif text-xl leading-tight">{l.name}</p>
                            <p className="text-base text-ink-soft">{vnd(l.price)}</p>
                          </div>
                          {/* Bookmark */}
                          <button aria-label="Save to wishlist" className="mt-0.5 shrink-0 text-ink-soft hover:text-ink transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                              <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
                            </svg>
                          </button>
                        </div>

                        {/* Size row */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#888]">Size</span>
                          <div className="flex items-center gap-2 text-[15px]">
                            <span>{l.size ?? "—"}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </div>

                        {/* Quantity row */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#888]">Quantity</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-3 text-[15px]">
                              <button
                                onClick={() => setQty(l.key, l.qty - 1)}
                                disabled={l.qty <= 1}
                                className="text-ink-soft hover:text-ink disabled:opacity-30 transition-colors"
                                aria-label="Decrease"
                              >
                                –
                              </button>
                              <span className="w-4 text-center tabular-nums">{l.qty}</span>
                              <button
                                onClick={() => setQty(l.key, l.qty + 1)}
                                className="text-ink-soft hover:text-ink transition-colors"
                                aria-label="Increase"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove button */}
                        <div>
                          <button
                            onClick={() => remove(l.key)}
                            className="rounded border border-[#d5d5d5] px-4 py-2.5 text-[13px] text-ink hover:border-ink transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order summary */}
              <aside className="lg:sticky lg:top-24 lg:h-fit">
                {/* Pricing rows */}
                <div className="space-y-3 text-[14px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">Subtotal</span>
                    <span>{vnd(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">Shipping</span>
                    <span>FREE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">Sales Tax</span>
                    <span className="text-right text-xs text-ink-soft">CALCULATED AT CHECKOUT</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="mt-8 space-y-3">
                  <button className="flex h-[52px] w-full items-center justify-center gap-3 rounded bg-ink text-white transition-opacity hover:opacity-85">
                    <span className="text-[15px] tracking-[0.03em]">CHECKOUT</span>
                    <span className="h-1 w-1 rounded-full bg-white" />
                    <span className="text-[15px] tracking-[0.03em]">{vnd(total)}</span>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="flex h-[52px] w-full items-center justify-center rounded bg-[var(--color-tile-deep)] text-[13px] tracking-[0.08em] uppercase text-ink transition-colors hover:bg-[var(--color-tile)]"
                  >
                    Continue Shopping
                  </button>
                </div>

                {/* Accordions */}
                <div className="mt-8">
                  <Acc title="SHIPPING & RETURNS | IMPORT DUTY & TAX">
                    <p>
                      Felixxii Atelier provides free shipping. Please allow up to 5–7 business days for your order to be
                      processed and shipped. Returns may be made within 7 days from the date of delivery.
                    </p>
                    <p className="mt-3">
                      All prices shown on the website include applicable duties and taxes, so there are no additional
                      customs duties or import fees to pay upon delivery.
                    </p>
                  </Acc>
                  <Acc title="INTEREST-FREE INSTALLMENTS AND VARIOUS PAYMENT OPTIONS">
                    <p className="font-medium text-ink">INTEREST-FREE INSTALLMENTS</p>
                    <p className="mt-1">
                      To check your eligibility and confirm whether your card is compatible with installment payments,
                      please contact your card issuer.
                    </p>
                    <p className="mt-3 font-medium text-ink">VARIOUS PAYMENT OPTIONS</p>
                    <p className="mt-1">
                      Felixxii Atelier provides a variety of payment options. You can view the available options on the
                      checkout page.
                    </p>
                  </Acc>
                </div>
              </aside>
            </div>
          )}

          {/* Bestsellers */}
          <section className="mt-20 border-t border-[var(--color-line)] pt-16">
            <h2 className="mb-8 font-serif text-3xl">Bestsellers this week</h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-6">
              {[...products]
                .sort((a, b) => (a.bestseller ?? 99) - (b.bestseller ?? 99))
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.id} onClick={() => setOpen(false)}>
                    <ProductCard item={p} index={i} />
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      {tab === "wishlist" && (
        <div className="flex flex-col items-center gap-5 py-32 text-center">
          <p className="font-serif text-2xl">Your wishlist is empty.</p>
          <button onClick={() => setOpen(false)} className="link-underline text-sm">
            Continue shopping →
          </button>
        </div>
      )}
    </div>
  );
}

function Acc({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[var(--color-tile-deep)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-[13px] leading-snug text-ink">{title}</span>
        <span className="ml-4 shrink-0 text-xl text-ink-soft">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="pb-5 text-[13px] leading-relaxed text-[#555]">{children}</div>
      )}
    </div>
  );
}
