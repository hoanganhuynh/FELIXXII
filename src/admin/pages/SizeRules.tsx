import { useState } from "react";
import { useAdmin, type SizeRuleRow } from "../store/adminData";
import { Card, Btn } from "../components/ui";
import type { BodyType } from "../data/generate";

export default function SizeRules() {
  const { rules, updateRule, styles } = useAdmin();
  const [active, setActive] = useState<BodyType>("hourglass");
  const rule = rules.find((r) => r.bodyType === active)!;
  const [draft, setDraft] = useState<SizeRuleRow[]>(rule.chart);
  const [dirty, setDirty] = useState(false);

  const switchTo = (b: BodyType) => {
    setActive(b);
    setDraft(rules.find((r) => r.bodyType === b)!.chart);
    setDirty(false);
  };

  const edit = (i: number, field: "bust" | "waist" | "hip", idx: 0 | 1, val: number) => {
    setDraft((d) =>
      d.map((row, ri) => {
        if (ri !== i) return row;
        const pair: [number, number] = idx === 0 ? [val, row[field][1]] : [row[field][0], val];
        return { ...row, [field]: pair };
      })
    );
    setDirty(true);
  };

  const save = () => { updateRule(active, draft); setDirty(false); };

  const usage = styles.filter((s) => s.bodyType === active).length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Size Rules</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Measurement ranges per body type. The storefront Body Profile scores a customer's bust/waist/hip against these to recommend a size.
        </p>
      </div>

      {/* body type tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {rules.map((r) => (
          <button key={r.bodyType} onClick={() => switchTo(r.bodyType)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${active === r.bodyType ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title={`${rule.label} · size chart (cm)`} action={dirty ? <Btn onClick={save} className="!h-7">Save</Btn> : <span className="text-[10px] text-ink-soft">Saved</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b edge text-left text-[10px] tracking-[0.1em] text-ink-soft">
                  <th className="px-5 py-2.5">SIZE</th>
                  <th className="px-2 py-2.5" colSpan={2}>BUST</th>
                  <th className="px-2 py-2.5" colSpan={2}>WAIST</th>
                  <th className="px-2 py-2.5" colSpan={2}>HIP</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((row, i) => (
                  <tr key={row.size} className="border-b edge last:border-0">
                    <td className="px-5 py-2 font-serif text-base">{row.size}</td>
                    {(["bust", "waist", "hip"] as const).map((f) => (
                      <td key={f} className="px-2 py-2" colSpan={2}>
                        <div className="flex items-center gap-1">
                          <NumIn value={row[f][0]} onChange={(v) => edit(i, f, 0, v)} />
                          <span className="text-ink-soft">–</span>
                          <NumIn value={row[f][1]} onChange={(v) => edit(i, f, 1, v)} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
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
                <p className="mt-1 text-xs leading-relaxed">{rule.easeNote}</p>
              </div>
              <p className="mt-4 text-[11px] text-ink-soft">
                <b className="text-ink">{usage}</b> styles are tagged to this body type.
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
    </div>
  );
}

function NumIn({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 w-14 rounded border edge bg-white/60 px-1.5 text-center text-xs tabular-nums focus:border-ink focus:outline-none" />
  );
}
