import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useBodyProfile } from "../store/bodyProfile";
import { products } from "../data/catalog";
import ProductImage from "../components/ProductImage";
import { vnd } from "../components/ProductCard";

type Tab = "account" | "purchases" | "wishlist" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "purchases", label: "Purchases" },
  { id: "wishlist", label: "Wishlist" },
  { id: "profile", label: "Profile" },
];

interface OrderItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  price: number;
}
interface Order {
  id: string;
  date: string;
  status: "Delivered" | "Processing" | "Shipped";
  items: OrderItem[];
  total: number;
}

const DUMMY_ORDERS: Order[] = [
  {
    id: "FX-2026-0041",
    date: "18 Jun 2026",
    status: "Delivered",
    items: [{ productId: "nguyet", name: "Nguyệt", size: "M", color: "Navy", price: 3_950_000 }],
    total: 3_950_000,
  },
  {
    id: "FX-2026-0019",
    date: "04 Apr 2026",
    status: "Delivered",
    items: [
      { productId: "lua-dem", name: "Lụa Đêm", size: "S", color: "Bordeaux", price: 4_500_000 },
      { productId: "ha-vu", name: "Hạ Vũ", size: "M", color: "Blush", price: 3_200_000 },
    ],
    total: 7_700_000,
  },
  {
    id: "FX-2025-0087",
    date: "12 Dec 2025",
    status: "Delivered",
    items: [{ productId: "suong-mai", name: "Sương Mai", size: "S", color: "Ivory", price: 6_800_000 }],
    total: 6_800_000,
  },
];

const WISHLIST_IDS = ["to-vang", "moc-lan", "thanh-tan"];

const STATUS_STYLE: Record<Order["status"], string> = {
  Delivered: "bg-[var(--color-tile)] text-ink-soft",
  Shipped: "bg-blue-50 text-blue-700",
  Processing: "bg-amber-50 text-amber-700",
};

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const prod = products.find((p) => p.id === order.items[0].productId);

  return (
    <div className="border-b edge py-5">
      <div className="flex items-start gap-4">
        {/* thumbnail */}
        {prod && (
          <Link to={`/san-pham/${prod.id}`} className="shrink-0">
            <div className="h-16 w-12 overflow-hidden rounded-sm bg-[var(--color-tile)]">
              <ProductImage item={prod} className="h-full w-full" />
            </div>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-ink-soft">#{order.id}</p>
              <p className="mt-0.5 font-serif text-base">
                {order.items.map((i) => i.name).join(" + ")}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {order.items.map((i) => [i.size, i.color].filter(Boolean).join(" / ")).join("  ·  ")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] tracking-wide ${STATUS_STYLE[order.status]}`}>
                {order.status}
              </span>
              <p className="mt-1.5 text-xs tabular-nums">{vnd(order.total)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-ink-soft">{order.date}</p>
            {order.items.length > 1 && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="text-[10px] text-ink-soft underline underline-offset-2"
              >
                {open ? "Hide items" : `Show all ${order.items.length} items`}
              </button>
            )}
          </div>
          {open && order.items.length > 1 && (
            <ul className="mt-3 space-y-1.5 border-t edge pt-3">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between text-xs">
                  <span>{item.name} — {[item.size, item.color].filter(Boolean).join(" / ")}</span>
                  <span className="tabular-nums text-ink-soft">{vnd(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistCard({ productId }: { productId: string }) {
  const prod = products.find((p) => p.id === productId);
  if (!prod) return null;
  return (
    <div className="group">
      <Link to={`/san-pham/${prod.id}`} className="block">
        <div className="aspect-[3/4] overflow-hidden rounded-sm bg-[var(--color-tile)]">
          <ProductImage
            item={prod}
            sizes="(max-width: 768px) 50vw, 33vw"
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </div>
      </Link>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <Link to={`/san-pham/${prod.id}`} className="font-serif text-[15px] leading-none">
            {prod.name}
          </Link>
          <span className="text-xs tabular-nums text-ink-soft">{vnd(prod.price)}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {prod.colors.map((c) => (
            <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, logout, updateProfile, setLoginOpen } = useAuth();
  const { measurements, setModal: openBodyProfile } = useBodyProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("account");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    if (!user) {
      setLoginOpen(true);
      navigate("/");
    }
  }, [user, navigate, setLoginOpen]);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone });
  }, [user, editing]);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const wishlistCount = WISHLIST_IDS.length;
  const recentOrder = DUMMY_ORDERS[0];

  return (
    <div className="min-h-screen pt-[62px]">
      {/* sub-nav */}
      <div className="sticky top-[62px] z-40 border-b edge bg-[var(--color-bg)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-5 md:px-8">
          <div className="no-scrollbar flex overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-4 text-[11px] tracking-[0.1em] transition-colors ${
                  tab === t.id ? "border-b border-ink text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.id === "wishlist"
                  ? `WISHLIST (${wishlistCount})`
                  : t.label.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] tracking-[0.1em] text-ink-soft transition-opacity hover:opacity-60"
          >
            LOGOUT
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-5 py-12 md:px-8">

        {/* ── ACCOUNT ── */}
        {tab === "account" && (
          <div>
            <p className="font-serif text-2xl tracking-tight">HELLO, {user.name.toUpperCase()}</p>

            <section className="mt-10 border-b edge pb-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.1em] text-ink-soft">RECENT PURCHASES</p>
                <button onClick={() => setTab("purchases")} className="text-[11px] tracking-[0.1em] text-ink-soft hover:text-ink">
                  MORE
                </button>
              </div>
              <OrderRow order={recentOrder} />
            </section>

            <section className="mt-8 border-b edge pb-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.1em]">
                  WISHLIST<sup className="ml-px text-[9px]">{wishlistCount}</sup>
                </p>
                <button onClick={() => setTab("wishlist")} className="text-[11px] tracking-[0.1em] text-ink-soft hover:text-ink">
                  MORE
                </button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {WISHLIST_IDS.map((id) => <WishlistCard key={id} productId={id} />)}
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] tracking-[0.1em]">PROFILE</p>
                <button onClick={() => setTab("profile")} className="text-[11px] tracking-[0.1em] text-ink-soft hover:text-ink">
                  MORE
                </button>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p>{user.name}</p>
                <p className="text-ink-soft">{user.email}</p>
                {user.phone && <p className="text-ink-soft">{user.phone}</p>}
              </div>
              <button
                onClick={() => { setTab("profile"); setEditing(true); }}
                className="mt-5 h-10 w-full max-w-xs border edge text-[11px] tracking-[0.1em] transition-colors hover:bg-ink hover:text-white"
              >
                EDIT PROFILE
              </button>
            </section>
          </div>
        )}

        {/* ── PURCHASES ── */}
        {tab === "purchases" && (
          <div>
            <p className="font-serif text-2xl tracking-tight">PURCHASES</p>
            <div className="mt-8">
              {DUMMY_ORDERS.map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          </div>
        )}

        {/* ── WISHLIST ── */}
        {tab === "wishlist" && (
          <div>
            <p className="font-serif text-2xl tracking-tight">
              WISHLIST<sup className="ml-1 text-base">{wishlistCount}</sup>
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
              {WISHLIST_IDS.map((id) => <WishlistCard key={id} productId={id} />)}
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <div>
            <p className="font-serif text-2xl tracking-tight">PROFILE</p>

            {!editing ? (
              <div className="mt-8">
                <div className="space-y-2 text-sm">
                  <p>{user.name}</p>
                  <p className="text-ink-soft">{user.email}</p>
                  <p className="text-ink-soft">{user.phone || "—"}</p>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-6 h-10 w-full max-w-xs border edge text-[11px] tracking-[0.1em] transition-colors hover:bg-ink hover:text-white"
                >
                  EDIT PROFILE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-8 max-w-sm space-y-5">
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Full Name</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Email</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <label className="block border-b edge pb-2">
                  <span className="text-[10px] text-ink-soft">Phone</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="0xx xxx xxxx"
                    className="mt-1 w-full bg-transparent text-sm focus:outline-none"
                  />
                </label>
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="h-10 flex-1 bg-ink text-white text-[11px] tracking-[0.1em] transition-opacity hover:opacity-85">
                    SAVE
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="h-10 flex-1 border edge text-[11px] tracking-[0.1em] transition-colors hover:bg-[var(--color-tile)]">
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            <div className="mt-12 border-t edge pt-8">
              <p className="text-[11px] tracking-[0.1em]">BODY PROFILE</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                {measurements
                  ? "Your measurements are saved. Size recommendations are active on all products."
                  : "Save your measurements once — get automatic size recommendations for every product."}
              </p>
              <button
                onClick={() => openBodyProfile(true)}
                className="mt-4 h-10 border edge px-8 text-[11px] tracking-[0.1em] transition-colors hover:bg-ink hover:text-white"
              >
                {measurements ? "UPDATE MEASUREMENTS" : "ADD MEASUREMENTS"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
