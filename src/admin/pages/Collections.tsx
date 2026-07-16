import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../store/adminData";
import { Card, Btn, Badge } from "../components/ui";
import { compactVnd, compact } from "../lib/format";
import { COLLECTIONS, CATEGORIES } from "../../data/catalog";

interface Row { id: string; label: string; season: string; note: string; styles: number; skus: number; revenue: number; units: number; }

export default function AdminCollections() {
  const styles = useAdmin((s) => s.styles);
  const [extra, setExtra] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const rows: Row[] = useMemo(() => {
    const base = COLLECTIONS.map((c) => {
      const inCol = styles.filter((s) => s.collection === c.id);
      return {
        id: c.id, label: c.label, season: c.season, note: c.note,
        styles: inCol.length,
        skus: inCol.reduce((n, s) => n + s.variants.length, 0),
        revenue: inCol.reduce((n, s) => n + s.revenue, 0),
        units: inCol.reduce((n, s) => n + s.unitsSold, 0),
      };
    });
    return [...base, ...extra];
  }, [styles, extra]);

  const catRows = useMemo(
    () => CATEGORIES.map((c) => {
      const inCat = styles.filter((s) => s.category === c.id);
      return {
        id: c.id, label: c.label,
        styles: inCat.length,
        skus: inCat.reduce((n, s) => n + s.variants.length, 0),
        revenue: inCat.reduce((n, s) => n + s.revenue, 0),
      };
    }),
    [styles]
  );

  const save = (row: Row) => {
    if (creating) setExtra((e) => [...e, { ...row, id: `col-${Date.now()}`, styles: 0, skus: 0, revenue: 0, units: 0 }]);
    else setExtra((e) => e.map((r) => (r.id === row.id ? row : r)));
    setEditing(null);
    setCreating(false);
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">Collections</h1>
          <p className="mt-1 text-xs text-ink-soft">Seasonal stories · a style belongs to exactly one collection</p>
        </div>
        <Btn onClick={() => { setCreating(true); setEditing({ id: "", label: "", season: "", note: "", styles: 0, skus: 0, revenue: 0, units: 0 }); }}>+ NEW COLLECTION</Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.id} title={r.season} action={
            <div className="flex gap-2">
              <button onClick={() => { setCreating(false); setEditing(r); }} className="text-[10px] text-ink-soft link-underline">Edit</button>
              {extra.some((e) => e.id === r.id) && (
                <button onClick={() => setExtra((e) => e.filter((x) => x.id !== r.id))} className="text-[10px] text-[var(--color-accent)] link-underline">Delete</button>
              )}
            </div>
          }>
            <div className="p-5">
              <p className="font-serif text-xl">{r.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{r.note}</p>
              <div className="mt-4 grid grid-cols-4 gap-3 border-t edge pt-4 text-center">
                <Cell k="Styles" v={String(r.styles)} />
                <Cell k="SKUs" v={r.skus.toLocaleString()} />
                <Cell k="Units" v={compact(r.units)} />
                <Cell k="Revenue" v={compactVnd(r.revenue)} />
              </div>
              <Link to={`/admin/products?collection=${r.id}`} className="mt-4 inline-block text-[11px] text-ink-soft link-underline">View styles →</Link>
            </div>
          </Card>
        ))}
      </div>

      {/* categories (taxonomy, fixed) */}
      <h2 className="mb-3 mt-8 font-serif text-xl">Categories</h2>
      <div className="overflow-hidden rounded-lg border edge bg-white/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
              <th className="px-4 py-2.5">CATEGORY</th><th className="px-2 py-2.5">SKU PREFIX</th>
              <th className="px-2 py-2.5 text-right">STYLES</th><th className="px-2 py-2.5 text-right">SKUS</th><th className="px-2 py-2.5 text-right">REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {catRows.map((c) => (
              <tr key={c.id} className="border-b edge last:border-0 hover:bg-[var(--color-tile)]/50">
                <td className="px-4 py-2.5 font-serif text-[15px]">{c.label}</td>
                <td className="px-2 py-2.5"><Badge>{`FX-${c.id === "dam-da-hoi" ? "EV" : c.id === "dam-bridal" ? "BR" : c.id === "ao" ? "TP" : c.id === "set" ? "ST" : "AC"}`}</Badge></td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{c.styles}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{c.skus.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-xs">{compactVnd(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">Categories are taxonomy — they define the SKU prefix, so they are fixed. Use <Link to="/admin/products" className="link-underline">bulk edit</Link> to move styles between them.</p>

      {editing && <EditModal row={editing} creating={creating} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return <div><p className="text-[10px] tracking-[0.08em] text-ink-soft">{k.toUpperCase()}</p><p className="mt-0.5 text-sm tabular-nums">{v}</p></div>;
}

function EditModal({ row, creating, onClose, onSave }: { row: Row; creating: boolean; onClose: () => void; onSave: (r: Row) => void }) {
  const [f, setF] = useState(row);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl">
        <h2 className="font-serif text-xl">{creating ? "New collection" : "Edit collection"}</h2>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="text-[10px] tracking-[0.1em] text-ink-soft">NAME</span>
            <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Fall — Winter 2026" className="input mt-1" /></label>
          <label className="block"><span className="text-[10px] tracking-[0.1em] text-ink-soft">SEASON CODE</span>
            <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} placeholder="FW26" className="input mt-1" /></label>
          <label className="block"><span className="text-[10px] tracking-[0.1em] text-ink-soft">NOTE</span>
            <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Velvet, draped silk, warm dark tones." className="input mt-1" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(f)}>{creating ? "Create" : "Save"}</Btn>
        </div>
      </div>
    </div>
  );
}
