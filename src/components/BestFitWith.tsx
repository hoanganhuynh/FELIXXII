import { useState } from "react";
import { accessoryById, LOOK_LABELS, type AccessoryType, type LookGroup } from "../data/catalog";
import GarmentArt from "./GarmentArt";

export default function BestFitWith({ look }: { look: Partial<Record<AccessoryType, LookGroup>> }) {
  const [selected, setSelected] = useState<Partial<Record<AccessoryType, string>>>({});
  const types = Object.keys(look) as AccessoryType[];

  return (
    <section className="border-y edge bg-[var(--color-tile)]/40 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-[1800px]">
        <p className="label text-[var(--color-accent)]">Styling suggestion</p>
        <h2 className="mt-2 font-serif text-3xl">Best fit with</h2>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Vote for the accessories our stylists say pair best with this piece — not sold here.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const group = look[type];
            if (!group) return null;
            return (
              <div key={type}>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-ink-soft">{LOOK_LABELS[type]}</p>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const accessory = accessoryById(opt.accessoryId);
                    if (!accessory) return null;
                    const isDirectorChoice = opt.accessoryId === group.directorChoice;
                    const isSelected = selected[type] === opt.accessoryId;
                    return (
                      <button
                        key={opt.accessoryId}
                        onClick={() => setSelected((s) => ({ ...s, [type]: opt.accessoryId }))}
                        className="flex w-full items-center gap-3 border-b edge py-2 text-left last:border-0"
                      >
                        <span
                          className={`h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ${
                            isSelected ? "ring-2 ring-[var(--color-accent)]" : "ring-black/10"
                          }`}
                        >
                          <GarmentArt accessory={accessory.type} color={accessory.colors[0]?.hex} className="h-full w-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-xs">
                            <span className="truncate">{accessory.name}</span>
                            {isDirectorChoice && (
                              <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[8px] tracking-[0.04em] text-white">
                                DIRECTOR'S CHOICE
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--color-tile-deep)]">
                            <span
                              className="block h-full rounded-full bg-[var(--color-accent)]"
                              style={{ width: `${opt.demoVotePct}%` }}
                            />
                          </span>
                        </span>
                        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-soft">
                          {opt.demoVotePct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
