import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Btn, Badge } from "../components/ui";
import { parseSku } from "../data/sku";
import { supabase } from "../../lib/supabase";

/* ---- import template ---- */
const COLUMNS = [
  { key: "sku", req: true, desc: "FX-{CC}-{SSSS}-{KK}-{ZZ}. Leave blank to auto-generate.", ex: "FX-EV-0142-NV-M" },
  { key: "style_code", req: true, desc: "Groups variants into one design.", ex: "FX-EV-0142" },
  { key: "name", req: true, desc: "Style name (shared by all variants).", ex: "Nguyệt Couture" },
  { key: "category", req: true, desc: "dam-da-hoi | dam-bridal | ao | set | phu-kien", ex: "dam-da-hoi" },
  { key: "collection", req: true, desc: "thu-dong-2025 | xuan-he-2026", ex: "thu-dong-2025" },
  { key: "color", req: true, desc: "Must match the palette name.", ex: "Navy" },
  { key: "size", req: true, desc: "XS S M L XL 2XL Custom", ex: "M" },
  { key: "price", req: true, desc: "VND, integer, no separators.", ex: "3950000" },
  { key: "stock", req: true, desc: "Integer ≥ 0.", ex: "24" },
  { key: "silhouette", req: false, desc: "a-line | mermaid | wrap | slip | ball-gown | shift", ex: "mermaid" },
  { key: "material", req: false, desc: "Free text.", ex: "Satin lụa ánh kim" },
  { key: "body_type", req: false, desc: "hourglass | pear | apple | rectangle | inverted-triangle", ex: "hourglass" },
  { key: "status", req: false, desc: "active | draft | archived (default draft)", ex: "active" },
  { key: "barcode", req: false, desc: "EAN-13. Auto-generated if blank.", ex: "8930142010" },
];

const SAMPLE_ROWS = [
  "FX-EV-0142-NV-M,FX-EV-0142,Nguyệt Couture,dam-da-hoi,thu-dong-2025,Navy,M,3950000,24,mermaid,Satin lụa ánh kim,hourglass,active,",
  "FX-EV-0142-NV-L,FX-EV-0142,Nguyệt Couture,dam-da-hoi,thu-dong-2025,Navy,L,3950000,18,mermaid,Satin lụa ánh kim,hourglass,active,",
  "FX-BR-0007-IV-CU,FX-BR-0007,Sương Mai,dam-bridal,xuan-he-2026,Ivory,Custom,12800000,3,ball-gown,Voan tơ nhiều lớp,pear,active,",
];

type RowResult = { line: number; sku: string; status: "ok" | "warn" | "error"; message: string };

/** Product import lives inside Products — it only ever creates products, so a
 *  top-level nav entry alongside Orders/Customers implied a scope it never had. */
export default function ImportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [mode, setMode] = useState<"create" | "upsert" | "overwrite">("upsert");
  const [checking, setChecking] = useState(false);

  const templateCsv = [COLUMNS.map((c) => c.key).join(","), ...SAMPLE_ROWS].join("\n");

  const download = () => {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "felixxii-product-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result));
    reader.readAsText(f);
  };

  const validate = async () => {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) { setResults([]); return; }
    const header = lines[0].split(",").map((h) => h.trim());
    const out: RowResult[] = [];

    // Ask the DB which SKUs already exist — one query for the whole file,
    // scoped to the SKUs in it (not a 7k-row download).
    setChecking(true);
    const fileSkus = lines.slice(1)
      .map((l) => l.split(",")[header.indexOf("sku")]?.trim())
      .filter(Boolean) as string[];
    const { data: hits } = fileSkus.length
      ? await supabase.from("variants").select("sku").in("sku", fileSkus)
      : { data: [] };
    const known = new Set((hits ?? []).map((h) => h.sku));
    setChecking(false);

    lines.slice(1).forEach((line, i) => {
      const cells = line.split(",");
      const get = (k: string) => cells[header.indexOf(k)]?.trim() ?? "";
      const sku = get("sku");
      const missing = COLUMNS.filter((c) => c.req && c.key !== "sku" && !get(c.key)).map((c) => c.key);

      if (missing.length) {
        out.push({ line: i + 2, sku: sku || "—", status: "error", message: t("imp.err_missing", { fields: missing.join(", ") }) });
        return;
      }
      if (sku && !parseSku(sku)) {
        out.push({ line: i + 2, sku, status: "error", message: t("imp.err_sku") });
        return;
      }
      if (Number.isNaN(Number(get("price"))) || Number(get("price")) <= 0) {
        out.push({ line: i + 2, sku, status: "error", message: t("imp.err_price") });
        return;
      }
      if (sku && known.has(sku)) {
        out.push({
          line: i + 2, sku,
          status: mode === "create" ? "error" : "warn",
          message: mode === "create" ? t("imp.err_exists") : t("imp.warn_exists", { action: mode === "overwrite" ? t("imp.overwrite") : t("imp.upsert") }),
        });
        return;
      }
      out.push({ line: i + 2, sku: sku || "(auto)", status: "ok", message: sku ? t("imp.new_sku") : t("imp.auto_sku") });
    });
    setResults(out);
  };

  const counts = results
    ? { ok: results.filter((r) => r.status === "ok").length, warn: results.filter((r) => r.status === "warn").length, error: results.filter((r) => r.status === "error").length }
    : null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 mx-auto my-6 w-[min(1100px,calc(100%-2rem))] rounded-lg bg-[var(--color-bg)] p-6 shadow-2xl md:p-8">
        <button onClick={onClose} aria-label={t("common.close")} className="absolute right-5 top-5 text-ink transition-opacity hover:opacity-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="mb-5">
          <h2 className="font-serif text-2xl">{t("imp.title")}</h2>
          <p className="mt-1 text-xs text-ink-soft">{t("imp.subtitle")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* template */}
        <Card title={t("imp.step1")} action={<Btn variant="ghost" onClick={download} className="!h-7">{t("imp.download")}</Btn>}>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg)]">
                <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                  <th className="px-4 py-2">{t("imp.col_column")}</th><th className="px-2 py-2">{t("imp.col_rule")}</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.key} className="border-b edge last:border-0">
                    <td className="px-4 py-2 align-top">
                      <p className="font-mono text-[11px]">{c.key}</p>
                      {c.req ? <span className="text-[9px] text-[var(--color-accent)]">{t("imp.required")}</span> : <span className="text-[9px] text-ink-soft">{t("imp.optional")}</span>}
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-[11px] text-ink-soft">{c.desc}</p>
                      <p className="mt-0.5 font-mono text-[10px]">{c.ex}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* upload */}
        <div className="space-y-4">
          <Card title={t("imp.step2")}>
            <div className="p-5">
              <div className="mb-4 flex gap-1.5">
                {(["create", "upsert", "overwrite"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${mode === m ? "border-ink bg-ink text-white" : "edge"}`}>
                    {m === "create" ? t("imp.create_only") : m === "upsert" ? t("imp.upsert") : t("imp.overwrite")}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-[11px] text-ink-soft">
                {mode === "create" && t("imp.mode_create")}
                {mode === "upsert" && t("imp.mode_upsert")}
                {mode === "overwrite" && t("imp.mode_overwrite")}
              </p>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed edge py-8 text-center transition-colors hover:bg-[var(--color-tile)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-ink-soft"><path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                <span className="mt-2 text-xs">{t("imp.drop")}</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>

              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={t("imp.paste")}
                rows={5}
                className="mt-3 w-full rounded-md border edge bg-white/50 p-3 font-mono text-[11px] focus:border-ink focus:outline-none"
              />
              <div className="mt-3 flex gap-2">
                <Btn onClick={() => void validate()} disabled={!raw.trim() || checking}>
                  {checking ? t("imp.checking") : t("imp.validate")}
                </Btn>
                <Btn variant="ghost" onClick={() => setRaw(templateCsv)}>{t("imp.load_sample")}</Btn>
              </div>
            </div>
          </Card>

          {results && (
            <Card title={t("imp.step3")} action={
              counts && <span className="flex gap-1.5">
                <Badge>{`${counts.ok} ${t("imp.ok")}`}</Badge>{counts.warn > 0 && <Badge>{`${counts.warn} ${t("imp.warn")}`}</Badge>}{counts.error > 0 && <Badge>{`${counts.error} ${t("imp.error")}`}</Badge>}
              </span>
            }>
              <div className="max-h-64 overflow-y-auto">
                {results.length ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.line} className="border-b edge last:border-0">
                          <td className="w-10 px-4 py-2 text-[10px] text-ink-soft">L{r.line}</td>
                          <td className="px-2 py-2 font-mono text-[11px]">{r.sku}</td>
                          <td className="px-2 py-2">
                            <span className={`text-[11px] ${r.status === "error" ? "text-[var(--color-accent)]" : r.status === "warn" ? "text-amber-600" : "text-emerald-600"}`}>{r.message}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="p-5 text-center text-xs text-ink-soft">{t("imp.nothing")}</p>}
              </div>
              {counts && counts.error === 0 && results.length > 0 && (
                <div className="border-t edge p-4">
                  <Btn onClick={() => alert(t("imp.committed", { count: counts.ok + counts.warn, mode }))}>
                    {t("imp.commit", { count: counts.ok + counts.warn })}
                  </Btn>
                </div>
              )}
            </Card>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
