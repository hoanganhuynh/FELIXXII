import { useEffect, useState } from "react";
import { useBodyProfile } from "../store/bodyProfile";
import { recommendSize, type Measurements } from "../data/sizing";

const FIELDS: { key: keyof Measurements; label: string; unit: string; min: number; max: number }[] = [
  { key: "bust", label: "Bust", unit: "cm", min: 70, max: 120 },
  { key: "waist", label: "Waist", unit: "cm", min: 55, max: 110 },
  { key: "hip", label: "Hips", unit: "cm", min: 75, max: 125 },
  { key: "height", label: "Height", unit: "cm", min: 140, max: 190 },
  { key: "weight", label: "Weight", unit: "kg", min: 38, max: 100 },
];

export default function BodyProfileModal() {
  const { modalOpen, setModal, save, clear, measurements, name } = useBodyProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (modalOpen) {
      setForm(
        measurements
          ? Object.fromEntries(Object.entries(measurements).map(([k, v]) => [k, String(v)]))
          : {},
      );
      setNameInput(name);
    }
  }, [modalOpen, measurements, name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setModal]);

  if (!modalOpen) return null;

  const filled = FIELDS.every((f) => form[f.key] && Number(form[f.key]) > 0);
  const preview: Measurements | null = filled
    ? (Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key])])) as unknown as Measurements)
    : null;
  const rec = preview ? recommendSize(preview, ["S", "M", "L", "XL"]) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    save(preview, nameInput.trim());
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => setModal(false)} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-[var(--color-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b edge px-6 py-5">
          <div>
            <h2 className="font-serif text-xl">Body Profile</h2>
            <p className="mt-0.5 text-xs text-ink-soft">Save once — get automatic size recommendations for every product.</p>
          </div>
          <button onClick={() => setModal(false)} aria-label="Close" className="text-ink hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5">
          <label className="mb-4 block">
            <span className="text-xs text-ink-soft">Name (optional)</span>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Linh"
              className="mt-1 w-full border-b edge bg-transparent py-1.5 text-sm focus:border-ink focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <label key={f.key} className={f.key === "weight" ? "col-span-2" : ""}>
                <span className="text-xs text-ink-soft">{f.label} ({f.unit})</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  required
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="mt-1 w-full border-b edge bg-transparent py-1.5 text-sm tabular-nums focus:border-ink focus:outline-none"
                />
              </label>
            ))}
          </div>

          {rec && (
            <div className="mt-5 rounded-md bg-[var(--color-tile)] px-4 py-3">
              <p className="text-xs text-ink-soft">Recommendation for current measurements</p>
              <p className="mt-0.5 text-sm">
                Size <b className="font-serif text-base">{rec.size}</b> — fit <b>{rec.confidence}</b>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!filled}
            className="mt-6 h-11 w-full rounded-md bg-ink text-white transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            <span className="label text-white">Save Profile</span>
          </button>
          {measurements && (
            <button type="button" onClick={clear} className="mt-3 w-full text-xs text-ink-soft underline underline-offset-2">
              Delete Profile
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
