# Phase 1 audit script

`get_metadata` only returns `id / name / type / x / y / width / height`. It
**cannot** see `layoutMode`, `fontSize`, fills or bindings — so it cannot answer
most of the rules. Use the **Plugin API** via `use_figma`.

Load the `figma-use` skill first (its rules are mandatory), then run this. It
writes nothing.

```js
// Page context resets every call — find the node by walking pages.
let target = null;
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  const n = page.findOne(x => x.id === "NODE_ID");   // e.g. "46:4416"
  if (n) { target = n; break; }
}
if (!target) return { error: "node not found on any page" };

const all = target.findAll(() => true);

// Icon/illustration internals are exempt from layout + grid rules.
// Matches a node literally named "SVG", a "*.svg" wrapper, or an imported
// vector-boolean group (the common name Figma assigns on import) — the
// narrower "name === 'SVG'" check alone misses raw imported logos/artwork
// that never got wrapped in a node literally named "SVG".
const inSvg = (n) => {
  let p = n.parent;
  while (p && p.id !== target.id) {
    if (p.name === "SVG" || /\.svg$/i.test(p.name) || p.name === "Clip path group") return true;
    p = p.parent;
  }
  return false;
};

// Any two children intersect → layered → absolute positioning is CORRECT.
// See layout-and-wrappers.md, rule 1, for why this gate exists.
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

// Sorts a single-text wrapper into inert / transferable / load-bearing.
// See layout-and-wrappers.md, rule 11, for the reasoning per bucket.
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

const texts = all.filter(n => n.type === "TEXT");
const sizes = {};
for (const t of texts) if (typeof t.fontSize === "number") sizes[t.fontSize] = (sizes[t.fontSize] || 0) + 1;

// Where a violation lives matters more than that it exists.
const ctx = (n, depth = 4) => {
  const chain = []; let p = n.parent;
  for (let i = 0; i < depth && p && p.id !== target.id; i++) { chain.unshift(p.name); p = p.parent; }
  return chain.join(" / ");
};

return {
  total: all.length,
  byType: all.reduce((a, n) => (a[n.type] = (a[n.type] || 0) + 1, a), {}),
  font_scale: Object.fromEntries(Object.entries(sizes).sort((a, b) => +a[0] - +b[0])),
  // Overlap is the gate. Without it this rule reports layered screens as broken.
  r1_no_autolayout: all
    .filter(n => (n.type === "FRAME" || n.type === "COMPONENT") &&
                 n.layoutMode === "NONE" && n.children?.length > 1 &&
                 n.name !== "SVG" && !inSvg(n) && !isLayered(n))
    .map(f => `${f.name} (${f.children.length} kids) — ${ctx(f)}`),
  r2_groups: all.filter(n => n.type === "GROUP").map(g => `${g.name} — ${ctx(g)}`),
  r3_text_in_group: texts.filter(t => t.parent?.type === "GROUP")
    .map(t => `"${t.characters.slice(0, 20)}" — ${ctx(t)}`),
  r4_under_10px: texts.filter(t => typeof t.fontSize === "number" && t.fontSize < 10)
    .map(t => ({ text: t.characters.slice(0, 20), size: Math.round(t.fontSize * 100) / 100, path: ctx(t) })),
  r5_fractional_type: texts.filter(t => typeof t.fontSize === "number" && !Number.isInteger(t.fontSize)).length,
  r6_fractional_geometry: all.filter(n => typeof n.width === "number" &&
      (!Number.isInteger(n.width) || !Number.isInteger(n.height)) && !inSvg(n) && n.name !== "SVG").length,
  r12_line_height: texts.map(t => {
      const lh = t.lineHeight, fs = t.fontSize;
      if (typeof fs !== "number" || lh === figma.mixed) return null;
      if (lh.unit === "AUTO") return { text: t.characters.slice(0,18), ratio: "AUTO" };
      const px = lh.unit === "PIXELS" ? lh.value : fs * lh.value / 100;
      const r = Math.round((px / fs) * 100) / 100;
      // flag only what is actually wrong: collisions, and px-hacks on small type
      if (r >= 1.0 && r <= 1.75) return null;
      if (r === 1 && fs >= 20) return null;                    // display type: deliberate
      return { text: t.characters.slice(0,18), fs, lh_px: px, ratio: r,
               likely: r > 2 ? "CSS line-height centering hack" : r < 1 ? "glyph collision" : "off-band",
               path: ctx(t) };
    }).filter(Boolean),
  r11_single_text_wrappers: all
    .filter(n => (n.type === "FRAME" || n.type === "GROUP") && !inSvg(n) &&
                 n.children?.length === 1 && n.children[0].type === "TEXT")
    .map(w => ({ name: w.name, text: w.children[0].characters.slice(0, 22), verdict: wrapperVerdict(w) })),
};
```

## Extra checks — run alongside or after the core script

**Rule 14, missing fonts** — run this *before* any write, it gates everything else:

```js
const used = {};                                   // what the file asks for
for (const t of target.findAll(n => n.type === "TEXT")) {
  if (t.fontName === figma.mixed) continue;
  const k = `${t.fontName.family}|${t.fontName.style}`;
  used[k] = (used[k] || 0) + 1;
}
const avail = await figma.listAvailableFontsAsync();          // what Figma has
const exact = new Set(avail.map(f => `${f.fontName.family}|${f.fontName.style}`));
const missing = Object.entries(used).filter(([k]) => !exact.has(k));
```

**Rule 20, icon set presence:**

```js
const components = await figma.root.findAll(
  n => n.type === "COMPONENT" || n.type === "COMPONENT_SET"
);
const iconLike = components.filter(c =>
  /icon/i.test(c.name) || (c.width <= 32 && c.height <= 32 && c.findAll(v => v.type === "VECTOR").length > 0)
);
const libraries = await figma.teamLibrary?.getAvailableLibraryComponentsAsync?.() ?? [];
```

**Rule 21, contrast:**

```js
function relLuminance({ r, g, b }) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(fg, bg) {
  const L1 = relLuminance(fg), L2 = relLuminance(bg);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
function nearestOpaqueBg(n) {
  let p = n.parent;
  while (p) {
    const f = p.fills?.find?.(f => f.type === "SOLID" && f.visible !== false && (f.opacity ?? 1) === 1);
    if (f) return f.color;
    p = p.parent;
  }
  return { r: 1, g: 1, b: 1 }; // fall back to canvas white, not black
}
const failing = texts.filter(t => {
  const fill = t.fills?.[0];
  if (!fill || fill.type !== "SOLID") return false;
  const ratio = contrastRatio(fill.color, nearestOpaqueBg(t));
  const large = t.fontSize >= 18 || (t.fontSize >= 14 && t.fontWeight >= 700);
  return ratio < (large ? 3 : 4.5);
});
```

**Rule 22, corner radius histogram:**

```js
const radii = {};
for (const n of all) {
  if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) {
    const r = n.cornerRadius >= 9999 ? "full" : Math.round(n.cornerRadius);
    radii[r] = (radii[r] || 0) + 1;
  }
}
```

**Rule 13, design system inventory** — see `design-system.md`, it has its own
multi-step workflow and a mandatory human gate.

**Rule 7, spacing histogram** — see `spacing-and-naming.md` for the clustering
method; this only collects the raw values:

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

**Rule 10, repeated UI with zero instances** — the most basic rule in the
table had, until this was added, no detector anywhere in this skill. Rules
15/16/17/19 each hand-detect *their own* named pattern (input, nav, table,
tabs); this one catches everything else — any structurally-identical sibling
group nobody componentized, regardless of what it's for. Measured on a real
file: a 6-item "Top Styles" ranked list (rank number + stacked name/meta +
trailing value, repeated identically 6 times, 0 instances) that didn't match
any of the named patterns above and so was invisible to every existing check:

```js
function fingerprint(n, depth = 3) {
  if (depth === 0 || !n.children) return n.type;
  return `${n.type}(${n.children.map(c => fingerprint(c, depth - 1)).join(",")})`;
}
// A node whose ANCESTOR is already an INSTANCE is already solved — editing
// the master component propagates everywhere. Only nodes with no instance
// anywhere above them are real gaps. Missing this check produced a false
// positive on a real file: "Link"/"FELIXXII"/logo.svg (the page header's
// logo lockup) looked like 8 hand-copied frames — every one was actually a
// descendant of a `Header` INSTANCE, already fully componentized, just not
// flagged as INSTANCE itself because nested-instance descendants keep their
// own FRAME/TEXT type.
const insideInstance = (n, root) => {
  let p = n.parent;
  while (p && p.id !== root.id) {
    if (p.type === "INSTANCE") return true;
    p = p.parent;
  }
  return false;
};

const groups = {};
for (const n of all) {
  if (n.type !== "FRAME" || !n.children?.length) continue;
  if (insideInstance(n, target)) continue;
  const key = `${n.name}::${fingerprint(n)}`;
  (groups[key] ||= []).push(n);
}
const repeatedNonComponentized = Object.values(groups)
  .filter(arr => arr.length >= 3 && arr.every(n => n.type !== "INSTANCE"))
  .map(arr => ({ name: arr[0].name, count: arr.length, path: ctx(arr[0]) }));
```

**A second false-positive mode: fingerprint too shallow for simple leaf
wrappers.** `name + fingerprint(depth 3)` collapses when the shape itself is
trivial — measured on the same file, `"Background"` (a plain
`FRAME → RECTANGLE`, no other children) matched **168** times across four
screens, but only **5** were actually the same UI element (a progress-bar
track); the rest were unrelated one-off background rectangles that happened
to share the same two-level shape. Same failure on `"Container"` holding
exactly two `TEXT` children: matched **40**, real count **1** — page titles,
stat labels, and table `Text+Sub` cells all fingerprint identically at depth
3 despite being different components.

**Don't trust a shallow-shape match on its own — confirm with a size check
before treating it as a finding:**

```js
const realGroup = groups[key].filter(n =>
  Math.round(n.width) === Math.round(groups[key][0].width) &&
  Math.round(n.height) === Math.round(groups[key][0].height));
// only realGroup.length >= 3 is a genuine repeated-UI candidate
```

Deeper/more distinctive shapes (three or more nested levels, mixed child
types) don't need this extra check — the false positives above both had
`children.length <= 2` with only one or two primitive child types. Treat a
shallow match (a lone `RECTANGLE`, or two bare `TEXT` children) as needing
the size check; a match with real internal structure usually doesn't.

`name + fingerprint` (not name alone) avoids false positives from
coincidentally-same-named containers with different insides (e.g. two
different things both called "Container"). **≥3 occurrences** is the
threshold, not 2 — two similar frames can be coincidence, three in the same
shape is a pattern. Cross-check each hit against the library the same way as
rule 17's detector: a hit here that also matches an existing component name
is rule 17/16/19's territory (existing component, not applied); a hit with no
library match at all is a genuinely new component to build.

**Rule 17, hand-built tables bypassing an existing Row/Cell library** — run
per screen, not once for the whole file. A component existing *somewhere* in
`🧩 Components` does not mean a given table uses it — a table added after the
library was built can still be 100% hand-drawn frames. See
`components.md`'s "A library component existing somewhere in the file proves
nothing about any given table" for the real-file measurement (15 hand-drawn
rows, 0 instances, right next to a fully componentized `Row`/`Cell` set):

```js
const libraryHasRowCell = figma.root.findAll(
  n => (n.type === "COMPONENT" || n.type === "COMPONENT_SET") && /^(Row|Cell)\b/.test(n.name)
).length > 0;
const handBuiltRows = all.filter(n =>
  n.type === "FRAME" && n.name === "Row" &&
  n.children.some(c => /^(Cell|Data)$/.test(c.name) && c.type !== "INSTANCE")
);
// libraryHasRowCell true + handBuiltRows non-empty == the component exists,
// this screen just never adopted it.
```

**Rule 9, generic layer names** — exempt SVG internals the same as every
other rule here, or the count is mostly noise from icon-path vectors:

```js
const genericNames = all.filter(n =>
  /^(Frame \d+|Group( \d+)?|Rectangle \d+|Ellipse \d+|Vector( \d+)?|Layer \d+|a)$/.test(n.name) && !inSvg(n)
);
```

**Rule 24, text boxes that silently wrap** — flags any fixed-width text taller
than roughly one line; see `typography-and-fonts.md` for the fix:

```js
function singleLineHeight(t) {
  const lh = t.lineHeight;
  if (lh === figma.mixed || lh.unit === "AUTO") return t.fontSize * 1.3;
  return lh.unit === "PIXELS" ? lh.value : t.fontSize * lh.value / 100;
}
const wrappedText = texts.filter(t =>
  t.textAutoResize === "NONE" && t.height > singleLineHeight(t) * 1.4
);
```

## Reading the output

- **Always exempt SVG/icon internals.** Vector guts are legitimately fractional
  and legitimately un-auto-laid-out. Counting them buries the real findings —
  an unfiltered run reported 72 layout violations where only **11** were real.
- **Report the path, not just the count.** "38 texts under 10px" is unactionable;
  "16 of them are the axis labels inside `Img - Revenue trend / Group`" is one fix.
- **Read the font histogram before anything else.** It is the fastest read on
  the file's health. A tidy file shows a short scale (10/12/14/16/20/24). A
  value like `9.828736305236816` means something was **scaled**, not chosen.

## Signatures worth recognising

| What you see | What it means |
|---|---|
| Geometry like `1162.260009765625`, everywhere | The file was **captured from a web page** — DOM heights are fractional. It was never on a pixel grid |
| One odd font size, e.g. `9.83` | A frame was resized with **"scale" instead of "resize"**, dragging type with it |
| `lineHeight` in px ≈ the parent's height, on a small font | A CSS `line-height: Npx` **centering hack**, imported literally |
| `Clip path group`, `a`, `Group 12` | **Imported SVG artifacts**. Name or flatten them |
| Screens with exactly 4 hand-placed children | Auto layout was never applied at the root |

## A violation in the design can be a violation in the code

If the file was generated from a running app, its type scale is your app's type
scale. Sub-10px text in the mockup usually means sub-10px text in production.
Say so — but fix the design here, and raise the code separately.
