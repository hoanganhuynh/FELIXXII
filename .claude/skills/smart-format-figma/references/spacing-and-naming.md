# Rules 7 & 9 in detail — spacing scale and layer naming

Both rules have existed in the table since the first draft of this skill and
neither had a detector or a detail section — the exact gap a self-audit of
this skill (not of a Figma file) surfaced. Both follow the same method as
rules 5 (type scale) and 22 (corner radius): **measure the histogram first,
snap to a clean scale second, never invent a ramp the file's own numbers
don't support.**

---

## Rule 7 — spacing scale

### Collect every spacing value in use

Spacing lives in two places on an auto-layout frame: `itemSpacing` (the gap
between children) and the four `padding*` properties. Collect all of them
across the whole target subtree:

```js
const spacingValues = {};
for (const n of all) {
  if (n.layoutMode && n.layoutMode !== "NONE") {
    for (const v of [n.itemSpacing, n.paddingLeft, n.paddingRight, n.paddingTop, n.paddingBottom]) {
      if (typeof v === "number" && v > 0) spacingValues[v] = (spacingValues[v] || 0) + 1;
    }
  }
}
```

Measured on a real file: **128 distinct spacing values.** The top of the
histogram was clean multiples of 4 (`8`×1,740, `12`×523, `16`×329, `4`×143,
`24`×42) — but sitting right alongside them were fractional web-capture
artifacts at nearly the same magnitude: `20.85`×288, `12.89`×195, `20.35`×138,
`10.5`×103, `20.96`×82, `8.01`×52, `18.46`×44, `23.85`×40, `20.74`×38. Every
one of those is drift off an intended round number (`20.85`, `20.35`,
`20.96`, `20.74` are all clustered around `20`/`21` — four different capture
artifacts of what was almost certainly a single design decision).

### Cluster before snapping — don't snap to the nearest *scale step*, snap to the nearest *real cluster*

This is the one place rule 7 differs from rules 5/22's method. A type scale
or radius scale has few enough distinct values that eyeballing the histogram
and picking clean steps works directly. Spacing, on a captured file, has
**dozens of near-duplicate fractional values that are all the same original
decision wearing different capture noise** — snapping `20.85` and `20.35` and
`20.96` and `20.74` each independently to "the nearest step in a scale you
pick" risks scattering one real value across two or three different scale
steps depending on rounding. Cluster first:

```js
function cluster(values, tolerance = 1.5) {
  const entries = Object.entries(values).map(([v, c]) => [parseFloat(v), c]).sort((a,b) => a[0]-b[0]);
  const clusters = [];
  for (const [v, c] of entries) {
    const last = clusters[clusters.length - 1];
    if (last && v - last.max <= tolerance) { last.max = v; last.total += c; last.members.push(v); }
    else clusters.push({ min: v, max: v, total: c, members: [v] });
  }
  return clusters;
}
```

Each resulting cluster is one real spacing decision; its weighted center (or
its most-common member) is the value to snap the whole cluster to — not each
member independently.

### Pick the scale, the same judgement call as rule 5

Once clusters are found, compare them against a standard step system (4px
base: `4/8/12/16/20/24/32/40/48`, or an 8px-only base if the file never uses
odd multiples of 4). This is a **human-sign-off judgement call exactly like
rule 5's type-scale reconciliation** — if clusters land at `4, 8, 12, 16, 21,
24`, deciding whether `21` collapses into `20` or `24` (or becomes its own
step) changes the visual rhythm and should be called out explicitly, the same
way rule 13's gate calls out every type-scale collision.

**Do this as part of building the design system (rule 13), not as a separate
pass.** Spacing tokens belong in the same Primitives collection as radius
tokens, following the same `spacing/N` naming rule 13's Style Guide section
already establishes — don't build a spacing scale that lives outside the
token system the rest of the file uses.

### Fixing it: bind, don't just round

Rounding `itemSpacing`/`padding*` to the nearest clean number (the way rule 6
rounds raw geometry) removes the *symptom* but not the *cause* — the next
capture or the next hand-edit reintroduces drift. Once the scale exists as
variables, **bind** the property instead:

```js
n.setBoundVariable("itemSpacing", spacingVar);
// padding: paddingLeft/Right/Top/Bottom each bind separately
n.setBoundVariable("paddingLeft", spacingVar);
```

A bound spacing value can't silently drift the way a raw number can — it's
either the token or it's a deliberate, visible override.

---

## Rule 9 — meaningful layer names

### Most "generic name" hits are not real violations

A naive scan for default Figma names produces a number that looks alarming
and is mostly noise:

```js
const genericNames = all.filter(n =>
  /^(Frame \d+|Group( \d+)?|Rectangle \d+|Ellipse \d+|Vector( \d+)?|Layer \d+|a)$/.test(n.name)
);
```

Measured on a real file: **374 hits.** The overwhelming majority were
`Vector` — the individual path segments *inside* an imported icon or logo
SVG. Naming a vector inside a 14-path Lucide icon instance is not a rule 9
violation any more than a fractional coordinate inside the same icon is a
rule 6 violation — **exempt SVG/icon internals from the naming scan the same
way every other geometry/layout rule does** (the `inSvg()` gate already
defined in `audit-script.md`):

```js
const realGenericNames = genericNames.filter(n => !inSvg(n));
```

### What's left after the exemption is the real list — and it's usually small and specific

After exempting icon internals, the remainder tends to fall into a few
recognisable buckets, each with a different fix:

| What's left | Likely cause | Fix |
|---|---|---|
| `Group` on a real container (not inside an icon) | A leftover from a rule 2 GROUP→FRAME conversion that kept the original generic name | Rename to what it structurally is (`Nav`, `Legend`, `Badge row`) — the conversion fixes the *type*, naming fixes the *label*, they're separate steps |
| `Frame 427`, `Rectangle 12` | Never renamed since Figma auto-assigned it on creation or capture | Name for its role, not its shape (`Card`, `Divider`, not `Rectangle 12`) |
| `Clip path group`, `a` | Imported SVG/logo artifact **outside** a node literally named `SVG` — the `inSvg()` gate only catches internals of a container *named* `SVG`; a raw imported logo without that wrapper name slips through | Either wrap it in a frame named `SVG`/`<name>.svg` so future audits correctly exempt its internals, or rename the handful of top-level artifact nodes directly |

**Don't rename in bulk with a single generic pattern** (e.g. every `Group` →
`Container`). A name should describe what the node *is for*, which requires
looking at its content and context — the same one-node-at-a-time discipline
rule 17's cell-type classification uses, not a find-and-replace.

### This is P3 — sequence it last, but don't skip it because it's low severity

Rule 9 is explicitly the lowest severity in the rule set (P3, "cost the next
reader real time" rather than break anything functionally), which is exactly
why it's easy to defer indefinitely — same shape of problem as rule 21's
"nothing in the tree looks broken" trap, just for a different reason (here,
nothing *fails*, it's just slower to read). Schedule it as the last step of
Phase 2 (already true — "naming and components last" — but make sure it
actually gets a pass, not just a mention in the plan).
