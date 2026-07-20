# Rules 1 & 11 in detail — layout containers and redundant wrappers

## Rule 1 — overlap is the gate

**Auto layout is for flow, not for layers.** A container whose children overlap
is a composition: a full-bleed background with a header and sidebar on top, a
chart with absolutely-placed axis labels, a modal over a scrim. Auto layout
stacks them and the screen is gone.

Detect layering before flagging anything (the `isLayered` function lives in
`audit-script.md`, reproduced here for reference):

```js
// Any two children intersect → layered → absolute positioning is CORRECT.
function isLayered(f) {
  const k = f.children;
  for (let i = 0; i < k.length; i++)
    for (let j = i + 1; j < k.length; j++) {
      const a = k[i], b = k[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height) return true;
    }
  return false;
}
```

Measured on a real file: the ungated rule reported **11** violations. Eight were
**correct as-is** — seven screen roots (`Background` + `Aside` + `Header` layered
over each other, plus a drawer parked off-canvas at `x = 1600`) and one chart
frame. **Only 3 were real**: a button bar that should wrap, and two stacked
cards. Applying auto layout to the other eight would have destroyed every screen
in the file.

Other signals that a container is legitimately absolute:

| Signal | Example |
|---|---|
| A child is **full-bleed** (covers the parent) | `Background 1600×1162` inside a `1600×1162` frame |
| A child sits **outside the parent's bounds** | `Background+Shadow` at `x=1600` in a 1600-wide frame — an off-canvas drawer |
| The frame is a **chart or illustration** | Vectors + hand-placed labels. Never auto layout |

> **This rule, written without the overlap gate, is dangerous.** It reads as a
> tidy universal ("everything should have auto layout") and it is not. Always
> measure overlap first; only then decide.

### `layoutWrap: WRAP` silently does nothing without a fixed width

Applied to a real 10-button bar: `layoutMode: HORIZONTAL, layoutWrap: WRAP,
itemSpacing, padding` — no error, looked done. It was not. The frame's primary
axis stayed **HUG**, so it grew to fit all 10 buttons on one row (**796px →
959px**) instead of wrapping into the original 2 rows. Proof only shows up if
you test it: narrowing the frame did not grow its height, meaning nothing was
actually wrapping — it was just overflowing.

**`WRAP` only wraps against a width. Without `primaryAxisSizingMode: "FIXED"`
and an explicit `resize()`, there is nothing for it to wrap against.**

```js
frame.set({ layoutMode: "HORIZONTAL", layoutWrap: "WRAP", itemSpacing, ... });
frame.resize(FIXED_WIDTH, frame.height);              // resize() forces FIXED as a side effect
frame.set({ primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "AUTO" }); // belt and braces
```

Get `FIXED_WIDTH` from the frame's own pre-fix width (what it was hand-placed
at), or its parent's content width if the frame is meant to fill it — never
invent one.

**Always prove wrap is live**, the same way the bug was caught: shrink the
frame, confirm the height grows (more rows), then restore.
```js
const h0 = frame.height;
frame.resize(frame.width - 300, frame.height);
const wrapped = frame.height > h0;      // must be true
frame.resize(FIXED_WIDTH, h0);          // restore
```

---

## Rule 2 — a GROUP→FRAME conversion can silently offset its children

Converting a group is not just a type swap. The naive version — read the
group's `x`/`y`/`width`/`height`, create a frame at that same position, then
`appendChild` every child across — **assumes the group's reported bounding
box equals the true local origin of its children.** That assumption breaks
for a specific, easy-to-hit case: **multiple full-size shapes stacked at the
same size, forming a ring or arc via strokes** (a donut/pie chart built from
overlapping same-size circles, each showing only part of its stroke).

**What actually happened on a real file:** a "donut chart" was 5 full
126×126 `ELLIPSE` nodes stacked inside a `GROUP`. After converting the group
to a frame (copying `group.x/y` to the new frame, then `appendChild`-ing the
five ellipses across), the ellipses rendered **146px to the right of where
the frame thought it was** — landing directly on top of an unrelated legend
sitting next to the chart. The frame's own position was correct; only the
children silently gained an offset during the move.

**Why this passed every check at the time.** The conversion script's own
verification (`get_metadata`, a screenshot of the immediate result) looked
fine — screenshots of an isolated chart don't reveal that its children moved
relative to *siblings elsewhere on the same screen*. The bug only became
visible in a **full-screen** screenshot, days of unrelated work later, when
another element (a legend) happened to sit where the mispositioned children
now rendered.

**The fix, and the rule going forward:** never trust that copying a group's
reported `x`/`y` to a new frame preserves children's visual position.
Compute each child's **absolute** position (walking up the real parent
chain) *before* the conversion, then after appending children into the new
frame, explicitly set each child's `x`/`y` to
`(childAbsoluteX - newFrameAbsoluteX, childAbsoluteY - newFrameAbsoluteY)` —
don't rely on the numeric x/y carrying over unchanged.

```js
function absPos(n, root) {
  let x = 0, y = 0, p = n;
  while (p && p.id !== root.id) { x += p.x; y += p.y; p = p.parent; }
  return { x, y };
}
// Before moving: record each child's absolute position relative to the page.
// After appendChild into the new frame: child.x = childAbs.x - frameAbs.x (same for y).
```

**Verify with a full-page screenshot, not just the converted node's own
screenshot.** A node-scoped screenshot only proves the node looks right in
isolation — it cannot show that the node's content now overlaps something
elsewhere on the same canvas. Phase 3's "screenshot before/after" step needs
at least one **whole-screen** shot per affected screen, not just close-ups of
the thing that was directly changed.

---

## `layoutMode: "GRID"` — replacing a child does not preserve its cell position

A frame with `layoutMode: "GRID"` (Figma's CSS-Grid-style auto layout) places
children by explicit `gridRowAnchorIndex`/`gridColumnAnchorIndex` +
`gridRowSpan`/`gridColumnSpan` — **not** by array order the way
`HORIZONTAL`/`VERTICAL` auto layout does. This matters the moment you
componentize something that lives inside a grid: swapping a hand-drawn field
for a component instance via `remove()` + `createInstance()` +
`insertChild(index, instance)` (the pattern that works for every other
layout mode in this skill) **drops the grid position** — the new instance
lands at whatever cell Figma assigns by default, not the cell the old node
occupied.

**Measured on a real file:** replacing 7 labeled form fields this way
scrambled a 5-row × 2-column form — `PRODUCT NAME` (meant to span both
columns on row 0) ended up on row 4, `STATUS` ended up on row 0, etc. The
screenshot looked *plausible* (still a grid of fields, nothing overlapping)
which is exactly what makes this dangerous — it reads as "done" unless you
compare field-by-field against the original.

**Detect it first:** `gridRowAnchorIndex`/`gridColumnAnchorIndex` are
**read-only** — there is no direct setter, so don't try `node.gridRowAnchorIndex
= n`. The actual mutation API is a method:

```js
node.setGridChildPosition(rowIndex, columnIndex);   // throws if the target cell is occupied
node.gridRowSpan = 2;                                 // these two ARE writable
node.gridColumnSpan = 2;
```

**The occupied-cell trap.** Because the grid is already full of the *old*
layout's positions when you're mid-replacement, moving item A to item B's
old cell throws until B has moved out of it — a simple loop over target
positions fails with "occupied by another node" the moment two items'
old/new positions overlap. **Park everything in freshly-added empty rows
first, then move each into its real target:**

```js
container.gridRowCount = originalRowCount + itemCount;   // add guaranteed-empty parking rows
items.forEach((item, i) => item.setGridChildPosition(originalRowCount + i, 0));
// now rows 0..originalRowCount-1 are completely empty — move each item into
// its real target with zero collision risk, then set spans
for (const [item, row, col, rowSpan, colSpan] of targets) {
  item.setGridChildPosition(row, col);
  if (colSpan > 1) item.gridColumnSpan = colSpan;
  if (rowSpan > 1) item.gridRowSpan = rowSpan;
}
container.gridRowCount = originalRowCount;   // shrink back — safe, parking rows are empty again
```

**Always record each child's `gridRowAnchorIndex`/`gridColumnAnchorIndex`/
`gridRowSpan`/`gridColumnSpan` before removing it**, the same discipline as
rule 2's absolute-position capture for GROUP→FRAME conversions — a different
layout mode, the identical underlying lesson: don't assume a structural
swap preserves position just because the visual diff looks clean.

---

## Rule 11 — classify before unwrapping

"One text child → unwrap" is right, but **most wrappers are not empty shells**.
Measured on a real 4,800-node file: of **1,012** single-text wrappers, only
**121 (12%)** could be deleted outright. Blind-unwrapping the other 888 would
have silently restyled the file.

Sort every candidate into three buckets:

| Verdict | Wrapper carries | Action |
|---|---|---|
| **Inert** | nothing | Unwrap. Delete the frame, keep the text |
| **Transferable** | only `layoutSizing*: FILL`, or a non-default `counterAxisAlignItems` | Unwrap, but **move that property onto the text node** first |
| **Load-bearing** | `padding`, `fill`, `stroke`, `cornerRadius`, `effects` | **Keep.** This is a real box — a button, a chip, a badge. The padding *is* the spacing |

```js
function wrapperVerdict(w) {
  const t = w.children[0];
  if (w.type === "GROUP") return "inert";                     // groups carry nothing by definition
  const hard = [];
  if ((w.paddingLeft||0)+(w.paddingRight||0)+(w.paddingTop||0)+(w.paddingBottom||0) > 0) hard.push("padding");
  if (Array.isArray(w.fills)   && w.fills.some(f => f.visible !== false)) hard.push("fill");
  if (Array.isArray(w.strokes) && w.strokes.length)  hard.push("stroke");
  if (Array.isArray(w.effects) && w.effects.length)  hard.push("effect");
  if (w.cornerRadius) hard.push("radius");
  // clipsContent is inert unless the box is actually narrower than its text
  if (w.clipsContent && Math.round(w.width) < Math.round(t.width)) hard.push("truncates");
  if (hard.length) return { keep: hard };

  const soft = [];
  if (w.layoutSizingHorizontal === "FILL" || w.layoutSizingVertical === "FILL") soft.push("fill-sizing");
  if (w.counterAxisAlignItems && w.counterAxisAlignItems !== "MIN") soft.push("align");
  return soft.length ? { transfer: soft } : "inert";
}
```

**`clipsContent` is not evidence.** A first pass that treated it as styling
called **616** wrappers load-bearing. Checking whether the box is actually
narrower than its text showed **0 of 1,012** truncate anything — every one was
inert `overflow: hidden` from the web capture. Test the *effect*, not the flag.

**Order:** unwrap **after** auto layout exists on the parent, never before. An
unwrapped text node dropped into a parent with no layout lands at an absolute
position and the screen falls apart.
