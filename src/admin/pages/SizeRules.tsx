import { useEffect, useState } from "react";
import { listRules, saveRule, styleCountByBodyType, type SizeRuleRow, type BodyType } from "../api/rules";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn } from "../components/ui";

type Field = "bust" | "waist" | "hip";

export default function SizeRules() {
  const { isAdmin, ready } = useAuth();
  const rules = useAsync(() => listRules(), [], []);
  const [active, setActive] = useState<BodyType>("hourglass");
  const [draft, setDraft] = useState<SizeRuleRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rule = rules.data.find((r) => r.body_type === active);
  const usage = useAsync(() => styleCountByBodyType(active), [active], 0);

  // reset the draft whenever the source rule changes (load or tab switch)
  useEffect(() => {
    if (rule) { setDraft(rule.chart); setDirty(false); }
  }, [rule]);

  const edit = (i: number, f: Field, bound: "min" | "max", val: number) => {
    setDraft((d) => d.map((row, ri) => (ri === i ? { ...row, [`${f}_${bound}`]: val } : row)));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await saveRule(active, draft);
      setDirty(false);
      rules.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Size Rules</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Measurement ranges per body type, stored in Postgres. The storefront Body Profile
          scores a customer's bust/waist/hip against these to recommend a size.
        </p>
      </div>

      {ready && !isAdmin && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Read-only — sign in as admin to edit the charts.
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {rules.data.map((r) => (
          <button key={r.body_type} onClick={() => setActive(r.body_type)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${active === r.body_type ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}>
            {r.label}
          </button>
        ))}
      </div>

      {rule && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card
            title={`${rule.label} · size chart (cm)`}
            action={dirty ? <Btn onClick={save} disabled={busy || !isAdmin} className="!h-7">{busy ? "Saving…" : "Save"}</Btn> : <span className="text-[10px] text-ink-soft">Saved</span>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                    <th className="px-5 py-2.5">SIZE</th>
                    <th className="px-2 py-2.5">BUST</th><th className="px-2 py-2.5">WAIST</th><th className="px-2 py-2.5">HIP</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.map((row, i) => (
                    <tr key={row.size} className="border-b edge last:border-0">
                      <td className="px-5 py-2 font-serif text-base">{row.size}</td>
                      {(["bust", "waist", "hip"] as Field[]).map((f) => (
                        <td key={f} className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <NumIn value={row[`${f}_min`]} disabled={!isAdmin} onChange={(v) => edit(i, f, "min", v)} />
                            <span className="text-ink-soft">–</span>
                            <NumIn value={row[`${f}_max`]} disabled={!isAdmin} onChange={(v) => edit(i, f, "max", v)} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!draft.length && <tr><td colSpan={4} className="py-8 text-center text-xs text-ink-soft">Loading…</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card title="Fit guidance">
              <div className="p-5">
                <p className="text-sm">{rule.guidance}</p>
                <div className="mt-3 rounded-md bg-[var(--color-tile)] p-3">
                  <p className="text-[10px] tracking-[0.1em] text-ink-soft">EASE RULE</p>
                  <p className="mt-1 text-xs leading-relaxed">{rule.ease_note}</p>
                </div>
                <p className="mt-4 text-[11px] text-ink-soft">
                  <b className="text-ink">{usage.data}</b> styles are tagged to this body type.
                </p>
              </div>
            </Card>

            <Card title="How the rule resolves">
              <ol className="space-y-2.5 p-5 text-xs text-ink-soft">
                <li><b className="text-ink">1.</b> Customer saves bust / waist / hip in Body Profile.</li>
                <li><b className="text-ink">2.</b> Each size is scored by distance from the midpoint of its range on all three metrics.</li>
                <li><b className="text-ink">3.</b> The body type applies its ease bias (e.g. Pear sizes to the hip).</li>
                <li><b className="text-ink">4.</b> The lowest-distance size wins, with a confidence band; ties escalate to <i>Custom</i> for bridal.</li>
              </ol>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function NumIn({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 w-14 rounded border edge bg-white/60 px-1.5 text-center text-xs tabular-nums focus:border-ink focus:outline-none disabled:opacity-50" />
  );
}
