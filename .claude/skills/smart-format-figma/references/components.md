# Rules 10, 15–19, 23, 25–27 in detail — component families and the library

Covers the general repeated-UI catch-all (10), input fields (15, with 18's
chevron requirement nested in), nav/menu items (16), tabs (19), tables (17),
organizing the library (23), catching a repeated container the leaf-level fix
missed (25), real icons vs. glyphs (26), and a library component's full
property schema (27). Read the intro of each before building — several of
these are only distinguishable from each other by construction, not by shape.

**Contents:**
- [Rule 10 — the general case, when nothing else matches](#rule-10--the-general-case-when-nothing-else-matches)
- [Rule 15 (+ 18) — input fields](#rule-15--18--input-fields)
- [Rule 16 — nav / menu items](#rule-16--nav--menu-items)
- [Rule 19 — Tabs are not chips are not nav items](#rule-19--tabs-are-not-chips-are-not-nav-items)
- [Rule 17 — tables are Row + Cell, not "Table"](#rule-17--tables-are-row--cell-not-table)
- [Rule 23 — organizing the library, and finding what's missing](#rule-23--organizing-the-library-and-finding-whats-missing)
- [Rule 27's schema, rule 26's glyph check](#the-full-property-schema-of-a-library-component) (inside rule 23's section — the library-completeness rules build on each other)

## Rule 10 — the general case, when nothing else matches

Rules 15–19 each detect one named pattern (input, nav, table, tabs) by its
own specific shape. Rule 10 is what's left: **any** structurally-identical
sibling group, repeated three or more times, that isn't an instance of
anything — whatever it happens to be for. It has no fixed shape to match on,
which is exactly why it's easy to leave with no detector at all.

Measured on a real file: a Dashboard "Top Styles" ranked list — 6 rows, each
`Item → Link → [rank number, stacked name/meta, trailing value]`, byte-for-byte
identical structure, 0 instances. It didn't match the input/nav/table/tabs
shape, so every rule-specific detector passed it by clean. Row 6 also carried
a mangled layer name (`Item → Link`, a flattened copy-paste artifact) — worth
noting as a rule 9 finding found *because* rule 10's check walked the group,
not something rule 9's own generic-name regex would have caught on its own.

**Detect by structural fingerprint, not by name.** Two frames can share a
name and mean different things (two unrelated containers both called
"Container"); fingerprint the shape too — type plus each child's type,
recursively, a few levels deep — and group by `name + fingerprint`:

```js
function fingerprint(n, depth = 3) {
  if (depth === 0 || !n.children) return n.type;
  return `${n.type}(${n.children.map(c => fingerprint(c, depth - 1)).join(",")})`;
}
```

**Threshold at 3, not 2.** Two similar frames can be coincidence (a card and
an unrelated card that happen to both hold one image and one line of text);
three in the same exact shape is a pattern someone is repeating, not a
coincidence.

****When swapping a hand-drawn node for an instance, check the old node's
`layoutPositioning` before removing it — don't assume the new instance
inherits it.** A fresh `createInstance()` defaults to `AUTO` (participates in
the parent's flow). If the parent is `layoutMode: "NONE"` this is invisible
(x/y just work either way), but if even one of several otherwise-identical
screens has its overlay-positioned sidebar/wrapper living inside an
auto-layout parent, the new instance gets flowed into the stack instead of
overlaid — measured on a real file: 7 of 8 screens swapped cleanly, the 8th
(the one screen whose parent used `layoutMode: VERTICAL` instead of `NONE`)
silently dropped the sidebar below the page content until
`instance.layoutPositioning = "ABSOLUTE"` was set to match the original.
Check every occurrence's parent, not just the first one used as the pattern.

Once a repeated group is found, check the library before deciding what kind
of fix it needs** — this splits into two different rules depending on the
answer:

- **A matching component already exists** (e.g. the group looks like `Row` →
  `Cell` and the library already has those) → this is rule 17's territory
  (or 16/19 if it matches that shape instead): swap to instances of what
  already exists, no new component to design.
- **Nothing in the library matches** (the Top Styles case: no "ranked list
  item" component anywhere) → this is a new component to build from scratch,
  following the same discipline as rules 15/16/19 — build the schema the
  *observed* rows actually need (here: TEXT properties for rank, title, meta,
  value; no variant axis, since nothing in the 6 rows varies structurally)
  and nothing speculative.

---

## Rule 15 (+ 18) — input fields

### Detect narrowly — "bordered box, short and wide" is not enough

A first pass using shape alone (stroke + input-ish aspect ratio, height 24–56)
returned **227 candidates** on a real file. Almost all were false positives —
table rows, list items, section headers: anything short and wide with a border
matches that shape.

**One text child is the real signal**, not the box shape:

```js
const isInputCandidate = (n) =>
  n.type === "FRAME" &&
  n.height >= 24 && n.height <= 56 && n.width >= 50 &&
  Array.isArray(n.strokes) && n.strokes.some(s => s.visible !== false) &&
  n.findAll(c => c.type === "TEXT").length === 1 &&           // exactly one line — not a row/list
  n.findAll(c => c.type === "VECTOR").length <= 1;            // at most one icon (chevron/search)
```

That cut 227 to 104 — better, but **pill-shaped toggle chips** (colour swatches,
size selectors — `Button` named, `cornerRadius: 16777200` i.e. fully round)
still matched: one text child, one border, input-sized. They are not form
inputs; they are a **different component family** (Chip/Toggle — rule 10, not
this rule).

**The strongest signal, when it exists, is what the designer already named
things.** This file called every text field `"Input"` and every dropdown
`"Options"`, consistently, everywhere. Trust that before a shape heuristic:

```js
const inputs  = all.filter(n => n.type === "FRAME" && n.name === "Input");
const selects = all.filter(n => n.type === "FRAME" && n.name === "Options");
```

That produced the real count: **43 text inputs + 17 selects = 60**, zero false
positives, zero as components or instances yet. If a file has no naming
convention, fall back to the stricter shape filter and expect to hand-verify
the result — don't trust it blind the way the first pass shouldn't have been.

### What the 60 instances actually share

All 60: `fill #ffffff`, `stroke #e2dccf`, `cornerRadius 6`, `fontSize 14`,
`text-fill #1c1917`. **One visual language already, just not declared as one.**
They differ only in: width (12 distinct values — should collapse to a `FILL`
sizing instance, not stay a size variant), whether they carry a trailing
chevron (select vs text), and their label/placeholder copy.

**A gap worth flagging, not fixing:** every field — including ones showing
literal placeholder copy like `"e.g. Lụa Đêm Couture"` — renders in the same
`#1c1917` ink as real values. The file has no placeholder-vs-filled visual
state at all. That is a real construction gap (rule 15 territory: the
component needs a state the design never drew) — separate from rule 13, which
is about colours *existing* but not being tokens.

### Build one component, four property types, nothing spare

| Figma property type | Use for | Values |
|---|---|---|
| **Variant — `Type`** | Structural shape | `Text` · `Select` · `Textarea` · `Number` |
| **Variant — `State`** | Visual state | `Default` · `Filled` · `Focus` · `Error` · `Disabled` |
| **Text property** | Editable copy per instance, without detaching | `label`, `placeholder`, `value`, `helperText` |
| **Boolean property** | Optional parts | `hasLabel`, `hasHelperText`, `required` |
| **Instance swap** | The one thing that genuinely varies structurally | `leadingIcon` (search, none), trailing chevron only exists on `Select` |

Sizing: **`layoutSizingHorizontal: FILL`** on the field, not a width variant.
12 distinct widths in the file were 12 instances of the same field in 12
different containers — not 12 intentional sizes. A width variant here would be
copying the candidate-detection mistake (mistaking incidental shape for a
deliberate axis) one level up, into the component itself.

### A labeled form field is its own component, not a Field plus a loose caption

The 60 measured field instances split into two real, distinct usages: ~53
unlabeled inline controls (search bars, toolbar filters — the `Field`
component covers these correctly) and a smaller set (7 on a real file) that
are **form fields with a caption above them** (`PRODUCT NAME`, `CATEGORY`,
`BASE PRICE`), each hand-assembled as a `[Label text, Field instance]`
wrapper repeated per field. That wrapper is itself a repeated pattern (rule
10) and belongs in its own component — call it `Form Field` — not left as a
loose text-plus-instance pairing rebuilt by hand each time.

Build it as `Label (boolean "Has label", TEXT "Label")` stacked above a
nested `Field` instance:

```js
const hasLabelProp = formField.addComponentProperty("Has label", "BOOLEAN", true);
const labelTextProp = formField.addComponentProperty("Label", "TEXT", "Label");
labelNode.componentPropertyReferences = { visible: hasLabelProp, characters: labelTextProp };
```

**The boolean, not a second variant, is the right axis for "has a label or
not."** A `Label=True/False` variant would double every other variant
combination; a boolean property toggles visibility on the *same* variant
instance instead.

**Lean means:** don't cross Type with State as a flat grid of named variants —
Figma variants multiply (4 Type × 5 State = 20 pre-built combinations, most
never used). Prefer `Type` as the variant axis and drive `State` via the
existing colour/effect tokens from rule 13 where possible, or accept the
smaller, real cross-product actually observed in the file rather than the
theoretical maximum.

### Rule 18 — the `Select` variant is not optional on its chevron

A `Select` is a `Text` field with one addition: a trailing chevron that says
"this opens something." Measured on a real file: **17 of 17 `Options` nodes
(100%) had zero vector children** — no chevron, anywhere, on any instance.

```js
const options = all.filter(n => n.type === "FRAME" && n.name === "Options");
const missingChevron = options.filter(o => o.findAll(c => c.type === "VECTOR").length === 0);
// 17/17 here
```

The consequence is concrete, not cosmetic: with an identical border, radius and
fill to the `Text` type, a `Select` with no chevron **cannot be told apart from
a plain text input by shape.** "Category" reads as an editable field, not a
menu, until someone clicks it.

**This is why the schema has `leadingIcon`/trailing-icon as an instance-swap
slot in the first place** — mark it **required, not optional, whenever
`Type = Select`**, and treat every existing `Options` instance in this file as
needing that slot filled before sync, not after. Don't let "the pattern
already had it in most places" stand in for a rule; here the pattern had it
*nowhere*, and only checking caught that.

---

## Rule 16 — nav / menu items

The clean case — worth including precisely because it has none of rule 15's
false-positive noise. Measured: **48 hand-drawn frames** (6 items × 8 screens),
zero components, zero instances. Every item: `199×36`, `cornerRadius 6`, one
icon + one label. Exactly **two states**, both present in the data — no
guessing needed:

| State | bg | text |
|---|---|---|
| Active | `#1c1917` | `#ffffff` |
| Inactive | none | `#948b7d` |

Component: one `Variant — State (Active/Inactive)`, `Instance swap — icon`,
`Text property — label`. That's the whole schema; anything more is
over-building a two-state toggle.

**No hover/focus was drawn** — expected for a static mockup, not a defect.
Add those states to the component for completeness (rule 15's placeholder gap
is the same situation), but don't report their absence as if the file were
wrong to omit them.

### The leaf is not the repeated unit — check the container too

Componentizing the 48 nav *items* is correct but **incomplete**. The 6 items
sit inside a `Nav` container that is **itself redrawn identically on all 8
screens** — same 6 items, same order, same spacing, differing only in which
item is Active. That whole sidebar block is a repeated unit too, and leaving
it hand-assembled means the next person editing the nav has to edit it in 8
places.

**After componentizing any repeated leaf, look one level up:** is the
container that holds the leaves also identical across screens? If so, build a
component for the container with a variant for whatever differs (here:
`Sidebar Nav` with `Active = Dashboard/Products/…`, one variant per active
item), holding instances of the leaf component. This is the same "repeated UI
is a component" rule (rule 10) applied at the block level, and it's the level
easiest to miss precisely because you just finished componentizing its
children and it feels done.

**Detector:** for each componentized-leaf container, hash its structure
(child count + each child's component + label order) per screen. If the hash
is identical across ≥2 screens, the container is a repeated unit — flag it.

### Don't bake the leaf's state into a variant of the container — expose it instead

A first pass at this built `Sidebar Nav` as a **6-variant component set** —
one full variant per possible active item, each variant containing all 6
`Nav Item` instances redrawn. **This is wrong**, and it's the same mistake
rule 27 warns against at a smaller scale: the container's only real
variable is *which single child is active*, and that's already the leaf
component's own `State` property. Building 6 container variants to express
"leaf state, but one level up" multiplies the container six times over for
information the leaf already carries.

**The correct construction is one component, not a variant set:** a single
`Sidebar Nav` holding 6 `Nav Item` instances (one default active, the rest
inactive), with each nested instance marked `isExposedInstance = true`:

```js
navItemInstance.isExposedInstance = true;
```

`isExposedInstance` (writable only on a primary instance inside a
`COMPONENT`/`COMPONENT_SET`) surfaces that nested instance at the top level
of every instance of the parent — a person using `Sidebar Nav` in a screen
can click straight into any nav item slot and flip its `State` variant
directly, no detaching, no digging through nested layers. This is a
different mechanism from `componentPropertyReferences` (which only exposes
`visible`/`characters`/`mainComponent` on a *specific* named layer) —
`isExposedInstance` exposes the *whole nested instance*, variant picker
included, which is exactly what "this child's state should be editable
per-use" needs.

**Rule of thumb:** if a container's cross-product with its children would
just be "child count × states already on the child," that cross-product is
fake — the child already owns that axis. Expose it; don't reproduce it as
container variants.

---

## Rule 19 — Tabs are not chips are not nav items

Three components can share the *exact same pill shape* and still be three
different things. Tell them apart by **construction**, not by guessing from
how they look:

| | Selection model | Shape | Has a colour-dot child? |
|---|---|---|---|
| Chip (rule 10/15) | multi-select | pill, `cornerRadius: 16777200` | **yes** |
| Nav item (rule 16) | single-select (routing) | rectangle, `cornerRadius: 6` | no |
| **Tabs** | single-select (in-page) | pill, `cornerRadius: 16777200` | **no** |

Tabs and Chips are only distinguishable by that one child — get the detector
wrong and you either build a chip picker that can't multi-select, or a Tabs
component still carrying an unused colour slot.

Measured: **3 tab groups, 13 items**, two states —

| State | bg | stroke | text |
|---|---|---|---|
| Active | `#1c1917` | `#1c1917` | `#ffffff` |
| Inactive | none | `#e2dccf` | `#1c1917` |

**The reason to build this, not just tidy it:** the *same* control (Body Type:
Hourglass/Pear/Apple/Rectangle/Inverted-triangle) appeared at **27px height in
one screen and 30px in another** — identical content, hand-drawn twice, already
drifted. That drift is exactly what a shared component prevents; it is not a
hypothetical benefit.

Schema: `Variant — State (Active/Inactive)`, `Text — label`. No colour slot,
no icon slot — the data shows none, so the component gets none (same
discipline as rule 16).

---

## Rule 17 — tables are Row + Cell, not "Table"

### Diagnose row-height "inconsistency" before calling it one

Three tables measured **43px, 58px, 59px** row heights. That reads like drift
(rule 6/7 territory) until you look at *why*:

```
// Customers "customer" cell: two TEXT nodes stacked vertically (different y)
["Phạm Ngọc", "ngọc112@email.com"]     →  name / email   → tall cell
// Orders "customer" cell: two TEXT nodes on the SAME y — inline, not stacked
["Dương Hà", "· Biên Hòa"]             →  name · city    → single-line cell
```

Both cells report "2 text nodes" to a naive detector. Only one of them is
actually two *rows*. **Check node `y`, not text-node count**, to tell a
stacked cell (`Text+Sub`) from an inline one (`Text+Meta`):

```js
const isStacked = (cell) => {
  const t = cell.findAll(n => n.type === "TEXT");
  return t.length >= 2 && Math.round(t[0].y) !== Math.round(t[1].y);
};
```

Once cells are classified correctly, **58 vs 59 is rounding (rule 6), and 43
vs 58 is content — the row is exactly as tall as its tallest cell.** Set the
Row component's height to `HUG`, not a fixed token. A "shorter" row is not a
bug to fix; it is auto layout doing its job.

### The badge is nested one level inside a generic cell wrapper

A cell holding a status pill is not itself the pill:

```
Data (transparent wrapper — this is the generic Cell)
 └─ Overlay (the actual pill: solid fill, cornerRadius 16777200)
     ├─ Overlay+Shadow (a white ring/border rect, also fully round)
     └─ TEXT (the label)
```

Measured tones: `VIP` → fill `#a85360` / text `#7c1f2b`. `active` → fill
`#ecfdf5` / text `#007a55`. These are **the same semantic tones the codebase
already uses for its own Badge component** (rule 13's "the hexes already are
tokens" applies again here) — recover the tone names, don't invent a new set.

Build **Badge as its own small component** (`Variant — Tone`: bordeaux / green
/ amber / grey / …), and give `Cell` a `Type: Badge` variant whose content
slot is an **instance of Badge** — not a copy of the pill redrawn inline.

### Cell types actually observed — build exactly these, not a guess

| Cell type | Signature | Found in |
|---|---|---|
| `Text` | one TEXT node | every table |
| `Text+Sub` | two TEXT nodes, **stacked** (different y) | Products (name + "12 SKUs · a-line"), Customers (name + email) |
| `Text+Meta` | two TEXT nodes, **inline** (same y) | Orders (customer name · city) |
| `Numeric` | one TEXT, tabular figures, right-aligned | order totals, LTV, counts |
| `Badge` | nested pill (above) | status, segment |
| `Checkbox` | small square, `cornerRadius ~2–3`, no text | Products row-select |
| `SwatchGroup` | 2–4 small circles, each with a white ring | Products colour column |
| `IconActions` | 1–2 icon-only frames, no fill, no border | Products row actions (duplicate/delete) |

Eight types, measured. Do not add a type the data doesn't show, and do not
collapse `Text+Sub`/`Text+Meta` into one — they are visually and structurally
different (stacked vs inline) even though a shallow detector sees "2 texts"
for both.

### The component grain

```
Table screen
 └── Row              (auto layout, HORIZONTAL, height: HUG, border-bottom only)
       ├── Cell instance (Type: Text)
       ├── Cell instance (Type: Text+Sub)
       ├── Cell instance (Type: Badge)  → slot holds a Badge instance
       └── ...N cells, per screen
```

`Row` is the reusable unit — **not** "Table". A table with 6 columns and a
table with 9 columns are both just a `Row` holding a different number of
`Cell` instances; there is no monolithic component that fits both without
either forking or carrying unused slots.

### A library component existing somewhere in the file proves nothing about any given table

Rules 15–19's detectors (and the ones above) all ask "does this pattern exist
as a component *anywhere*." That question can pass while a specific table on
a specific screen still fails rule 17 completely — because the library was
built against the tables that existed *at the time*, and a table added later
was hand-drawn instead of instanced against it.

Measured on a real file: `Products`, `Orders`, and `Customers` had already
been componentized — the library page carried `Row`, `Cell`, `Cell/Type=Text`,
`Cell/Type=Text+Sub`, `Cell/Type=Badge`, and four more `Cell/Type=*` variants,
all documented above. A later `Import products` screen added a 15-row,
2-column "template rules" table — same shape (`Row` → `Cell` → text) — built
as 15 hand-drawn `Row` frames holding 30 hand-drawn `Data` frames, **zero
instances of the library that already existed one page away.**

**The detector has to be per-table, not per-file.** "Does a `Row`/`Cell`
component exist in `🧩 Components`" is a yes/no that stays yes forever once
answered once; it says nothing about the table someone just added. Check
every `Row`-shaped frame on every screen against the library, every time:

```js
// Rule 17 (and 10): a Row/Cell-shaped frame that isn't actually an instance,
// checked against whatever Row/Cell library already exists in the file —
// existence of the library elsewhere does not mean this table uses it.
const libraryHasRowCell = figma.root.findAll(
  n => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && /^(Row|Cell)\b/.test(n.name)
).length > 0;

const handBuiltRows = all.filter(n =>
  n.type === "FRAME" && n.name === "Row" &&                 // shaped like the known pattern
  n.children.some(c => /^(Cell|Data)$/.test(c.name) && c.type !== "INSTANCE")
);
// handBuiltRows.length > 0 while libraryHasRowCell is true == exactly this bug:
// the component exists, this table just isn't using it.
```

Run this check **per screen**, not once for the whole file — a screen built
before the library existed and a screen built after it both look identical
to a detector that only asks "is there a `Row` component somewhere."

---

## Rule 23 — organizing the library, and finding what's missing

Studied against two commercial reference kits (a SaaS admin kit and a mobile
app kit) — both share a structure worth copying, and both do something this
skill's default posture ("only build what's observed") deliberately does not.

### Where components live

Every reference kit puts components on their **own page**, never next to the
screens that use them. Within that page, each component family sits in a
named **Section** (Figma's canvas-organizing node, not a frame) — `Button`,
`Input`, `Select`, `Badge`, `Avatar`, `Table`, one section each — arranged in
a loose grid with generous gaps, each section carrying a heading label.

```
Page: 🧩 Components
 ├── Section "Button"   (variant/state grid)
 ├── Section "Input"    (variant/state grid)
 ├── Section "Badge"    (tone grid)
 └── ...
```

**Never leave components floating in negative-space beside a screen.** It's a
common shortcut while building (park the new component off-canvas near where
it's used) but it doesn't survive past that session — the next person (or the
next audit) finds a component nobody can locate. Move it to the Components
page as the last step of building it, not later.

### Documenting a family: full grid, not the observed subset

This is a real tension with rules 15/16/19's "match the real observed
cross-product, don't build the full grid" — and both are correct, for
different jobs:

- **Fixing a captured screen** (rules 15/16/19's normal case): build only the
  Type × State combinations the file actually shows. Inventing a `Focus` or
  `Error` state nobody drew is speculative work with nothing to verify it
  against.
- **Documenting a component on its library page**: once the component exists,
  show its **full intended range** — every variant × state × size the
  component is *designed* to support, even combinations no current screen
  happens to use yet. A reference kit's Button section shows Solid/Ghost/
  Danger × Default/Hover/Disabled × every size, laid out as one grid, with
  every axis labeled — that's the point of a library page: it's the answer to
  "what does this component do," not a record of what's currently on screen.

Reference kits make every axis explicit with a label, grouped by bracket/rule
lines so the grid reads as a table without needing to click each instance:

```
              default              hover               focus
         ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
medium   │ Input  Input  │   │ Input  Input  │   │ Input  Input  │
small    │ Input  Input  │   │ Input  Input  │   │ Input  Input  │
```

Row groups (size) on the left, column groups (state) on top, sub-groups
(e.g. `Disabled: true/false`) nested inside each with their own label and a
dashed separator. Every cell is one instance; nothing is implied.

### Finding what the file never drew at all

Rules 15–19 fix components the file *has*, badly built. They don't catch
components the file **never drew a single instance of** — those produce zero
findings because there's nothing to detect. A button rendered as a generic
`Link`/`Overlay+Border` frame everywhere, never once as a distinct
component-shaped pattern, is invisible to a detector that only looks at what
repeats.

**Cross-check against the codebase's own component file**, not just the
Figma canvas:

```bash
grep -n "^export function" src/**/components/ui.tsx
```

Measured on a real file: the codebase's `ui.tsx` exported `Btn` (button),
`Badge`, `Card`, `StatTile` — the Figma file had badges, cards and stat tiles
somewhere, but **zero distinct button components**; every clickable action was
a one-off frame. The gap was invisible from inside Figma because nothing was
"wrong" with any individual button — there just wasn't a *component* for the
pattern the code already treats as one.

**Ground the missing component in the code, not in guessed styling.** The
codebase's `Btn` function had the literal variant list (`solid | ghost |
danger`), the exact Tailwind classes per variant, height, radius, padding —
build the Figma component to match those values, not a generic "primary/
secondary" guess. Same discipline as rule 13's token recovery: the code is
the source of truth, Figma is catching up to it.

### The full property schema of a library component

A commercial kit's Button component (measured on a real reference file) had
this property set — treat it as the template for what "complete" means:

- **Variant** (primary/secondary/outline/…) — the structural style axis
- **Size** (xsmall/small/medium/large) — a real axis, not an afterthought.
  A first build that omitted Size entirely had to be redone; a button
  component with no size axis is incomplete by commercial standards.
- **Status** (default/hover/active/disabled) — visual state
- **Leading icon** / **Trailing icon** — **BOOLEAN** properties toggling
  hidden icon slots, each paired with an **INSTANCE_SWAP** so the specific
  icon can be changed per instance
- **Label** — a **TEXT** property, so the caption is editable per instance
  *without detaching* and stays linked to its text style

The same reference kit's Input had `Size · Status · Placeholder(bool) ·
Disable(bool) · Leading icon · Trailing icon · Suffix · Prefix · Text ·
Typing(bool)` — the point isn't to copy that exact list, it's that a
library-grade field exposes each structural option as a **named property**,
not as a separate variant you have to hand-pick or a layer you detach to
edit.

### Name a genuine two-state toggle `On`/`Off`, not `Active`/`Inactive`

If a variant axis has exactly two values and the meaning is really "is this
switched on or not" (a selected nav item, a selected tab, a checked box),
name the variant **values** `On`/`Off` rather than a domain word pair like
`Active`/`Inactive` or `Selected`/`Unselected`. Reserve descriptive pairs for
axes that aren't a plain toggle (`Solid`/`Ghost`/`Danger` is a real category
axis, not a toggle, and stays as-is).

**Why this is worth doing even after instances already exist:** renaming a
variant's value is renaming the underlying component node — like every other
rename in this skill, existing instances reference it by node id, not by
name, so the change is free. Do it directly on the component:

```js
variant.name = variant.name.replace("State=Active", "State=On").replace("State=Inactive", "State=Off");
```

`On`/`Off` reads faster in the properties panel, matches Figma's own native
`BOOLEAN` property convention (a boolean toggle *displays* as On/Off), and
signals at a glance "this is a plain toggle" versus a multi-value enum that
needs actual documentation to understand. Applied to `Nav Item` and `Tabs`
in this file — both are exactly this shape (one child selected, the rest
not) and had been named `Active`/`Inactive` out of habit rather than
because the domain needed those specific words.

**Three Plugin-API gotchas learned building this:**
- `figma.variables.getVariableByIdAsync(id)` (and the sync `getVariableById`)
  needs the **full `"VariableID:13:194"` string, prefix included** — not the
  bare `"13:194"` you'd get by stripping it. Both calls **fail silently**:
  no throw, just `null` back, so `setBoundVariableForPaint(paint, "color",
  null)` quietly leaves `paint.color` at whatever placeholder you seeded it
  with (commonly `{r:0,g:0,b:0}`) and `boundVariables` empty. The node still
  gets a fill — solid black, unbound — so nothing errors and a quick glance
  at a small thumbnail can pass as "looks about right" (ink is *already*
  near-black) while a muted/secondary token silently renders as pure black
  instead. Read the id straight off an existing bound node
  (`node.fills[0].boundVariables.color.id`) rather than reconstructing it,
  and confirm the lookup actually returned a variable before trusting the
  fill — `if (!v) throw ...`, don't let it pass silently.
- `addComponentProperty(name, "INSTANCE_SWAP", value)` wants a **node id**
  for the default (`"1:6932"`), not a component `key` — passing a key throws
  "Property value is incompatible with component property type."
- Wire each layer to its property via
  `layer.componentPropertyReferences = { visible: boolPropId, mainComponent:
  swapPropId }` for icon slots, and `{ characters: textPropId }` for the
  label — set these on the layer *inside every variant*, using the property
  ids returned from `addComponentProperty`.

### The label must reference a text style, never be a detached override

When a component's label text is set by typing characters and picking a font
directly, it becomes a **detached override** — it no longer tracks the text
style, so a later change to `Ant/Small` won't reach it, and the "text isn't
linked to the defined style" problem the whole design-system pass was meant
to fix reappears inside the component. Apply the text style
(`setTextStyleIdAsync`) to the label, bind its fill to a colour variable, and
expose the copy as a TEXT component property. The instance can then change
*what it says* without breaking *how it's styled*.

### CTAs must use the icon set, not typographic glyphs

A distinct, easily-missed defect: text nodes that use a **typographic
character as an icon** — `←`, `→`, `▲`, `▼`, `‹`, `›` — instead of an
instance from the file's icon set. They render (the glyph is in the font), so
no font/geometry check flags them, but they're not the icon set: wrong
weight, wrong grid, no swap slot, and they break the moment the typeface
changes.

**Detect** by scanning text `characters` for arrow/triangle/chevron glyphs:

```js
const glyphRe = /[←→↑↓▲▼◀▶‹›»«]/;
const glyphIcons = texts.filter(t => glyphRe.test(t.characters));
```

Measured on a real file: **11** — a `← Products` back-link, four `View
styles →` / `Edit size chart →` link CTAs, and six KPI deltas (`▲ 12.4%`,
`▼ 0.4%`). **Fix** by stripping the glyph, wrapping the remaining text in a
small horizontal auto-layout frame `[icon, text]` (or `[text, icon]` for a
trailing arrow), and dropping in the matching icon instance
(`trending-up`/`trending-down` for the deltas, `arrow-left`/`arrow-right`
for the links) tinted to the text's own bound colour. A `+` prefix on a
button label (`+ NEW`) is the same defect — it belongs in the Leading-icon
slot as a `plus` instance, not as a literal `+` character in the label.
