# Rules 20–22 in detail — icons, contrast, corner radius

## Rule 20 — no icon set, no silent choice

Check for an existing icon set before any icon work — new components, filling
an instance-swap slot (rule 15's `leadingIcon`, rule 18's chevron), or a
missing vector on a nav item (rule 16).

```js
const components = await figma.root.findAll(
  n => n.type === "COMPONENT" || n.type === "COMPONENT_SET"
);
const iconLike = components.filter(c =>
  /icon/i.test(c.name) || (c.width <= 32 && c.height <= 32 && c.findAll(v => v.type === "VECTOR").length > 0)
);
const libraries = await figma.teamLibrary?.getAvailableLibraryComponentsAsync?.() ?? [];
```

- **`iconLike.length > 0` (or a connected library exposes icons):** reuse it.
  Match new icons to the existing set's style (stroke width, corner treatment,
  grid), don't mix a second set in.
- **Nothing found, anywhere:** **stop and ask.** Do not default to Lucide,
  Feather, Material Symbols, or any other library on your own judgement. Ask
  the human two things: (1) is there an icon set already in use elsewhere —
  another file, a design library, the codebase's `node_modules` — that this
  file should match, or (2) failing that, a URL or name for the set to import.

**Why this can't be inferred from the file alone:** unlike a missing font
(rule 14), where the file at least *names* what it wants, a file with zero
icon components gives no signal about intended style at all. Silently
importing one is the same mistake as substituting a font without asking
(rule 14) — except there's no fallback rendering to reveal it happened, so it
ships as if it were always the plan.

---

## Rule 21 — contrast

Compute contrast only between a text/icon fill and the **actual paint behind
it** — walk up to the nearest ancestor with an opaque fill, don't assume white.

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

**Flag placeholder-coloured text separately from real failures.** Rule 15
already notes placeholder copy sharing the same ink as real values — a
placeholder is *supposed* to read lighter, so a legitimate muted tone there
can still fail AA and that's a design decision (accept or lighten the
background), not a bug the way body copy failing would be.

**Don't test text sitting on a photo or gradient** — the underlying pixel
colour varies across the shape, so a single ratio number is meaningless.
Flag those for manual/visual review instead of a computed pass/fail.

**This rule is easy to defer indefinitely — don't.** It has no visible
symptom in the node tree the way a missing font or a broken auto-layout
does, so it's the rule most likely to get pushed to "later" across several
work sessions. Measured on a real file, after several rounds of other fixes,
one highlight card's body text came out to **a 1.5:1 contrast ratio** —
`text/sub-600` (a token meant for secondary text on light backgrounds) had
been applied on a mid-dark accent-coloured card. 1.5:1 is not a marginal
fail; at that ratio the text is functionally invisible. The fix was to match
the pattern already used correctly elsewhere in the same file (a
same-family highlight card used `surface`/white for both its heading and
body text on a dark fill, differentiating hierarchy by size instead of by
two different text colours) — **check for an existing correct example in
the file before inventing a new pairing.**

---

## Rule 22 — corner radius scale

Same method as the type scale (rule 5) and spacing scale (rule 7): collect
what the file actually uses before deciding what the scale should be.

```js
const radii = {};
for (const n of all) {
  if (typeof n.cornerRadius === "number" && n.cornerRadius > 0) {
    const r = n.cornerRadius >= 9999 ? "full" : Math.round(n.cornerRadius);
    radii[r] = (radii[r] || 0) + 1;
  }
}
```

A short, clean histogram (`4, 6, 8, 12, full`) needs no change — that's
already a scale, just not tokenised (fold into rule 13's token pass). A long
tail of one-off values (`5, 7, 9, 11, 13...`) is the same drift rule 6 catches
in geometry, just on this one property — snap each to the nearest step in the
observed scale, don't invent a new ramp the file's shapes don't support.

**Radius is role-bound, not size-bound.** Don't collapse "card corner" and
"badge corner" into the same step just because a growth-fit made them measure
equal in one instance — check what the shape *is* (rule 15/16/19's
component-family reasoning applies again here) before merging two radii that
happen to coincide.
