# Rules 12 & 14 in detail — line height and missing fonts

## Rule 12 — line height

Judge the **ratio** (`lineHeight ÷ fontSize`), never the raw px. Bands by role:

| Role | Size | Ratio | Note |
|---|---|---|---|
| Display / KPI number | ≥ 20px | **1.0 – 1.25** | 1.0 is legitimate here — large digits with no descenders |
| Heading | 16 – 20px | **1.2 – 1.4** | |
| Body | 13 – 16px | **1.4 – 1.6** | |
| UI label / caption | 10 – 12px | **1.2 – 1.4** | |
| Anything | any | **< 1.0 = P1** | Glyphs collide and clip |

Resolve the unit before judging — `lineHeight` is `AUTO`, `PIXELS` or `PERCENT`:

```js
const px = lh.unit === "PIXELS" ? lh.value
         : lh.unit === "PERCENT" ? fs * lh.value / 100
         : null;                                  // AUTO — font default
const ratio = px === null ? null : Math.round((px / fs) * 100) / 100;
```

### A ratio near or above 3 is a CSS centering hack, not typography

The strongest signal in a web-captured file. Real example: a button's label was
**`fontSize: 11`, `lineHeight: 36px` → ratio 3.27**, and **36px was the button's
height**. On the web, `line-height: 36px` centres an 11px label inside a 36px
button. Figma imports the number literally, so the *text box* becomes 36px tall
and the glyphs float in the middle of it.

**Recognise it:** `lineHeight` in PIXELS ≈ the height of the parent frame, on a
small font.

**Fix it properly — two changes, not one:**
1. Set the text's line height to its band (11px label → ~14px, ratio ~1.3).
2. Give the **parent** auto layout with `counterAxisAlignItems: "CENTER"` and
   vertical padding. Centring is the container's job.

Change only the line height and the label sticks to the top of the button.

### Ratio 1.0 on display type is usually deliberate

Six KPI figures measured at `fontSize 24 / lineHeight 24`. That is `leading-none`
in the source, chosen so large numerals sit tight. **Do not "fix" it.** Flag
ratio 1.0 only when the type is small enough to have real descenders.

### `AUTO` is not wrong, but it is not a decision

59 nodes used `AUTO` — the font's built-in metric. It renders fine and drifts
the moment the typeface changes. Make it explicit when the file is meant to be
a source of truth; leave it otherwise. **P3, not P1.**

---

## Rule 24 — text boxes that silently wrap

A text node can have `textAutoResize: "NONE"` with an explicit fixed `width`
narrower than its own content needs. Figma doesn't error or warn — it just
wraps, character by character if the width is narrow enough, and the box's
`height` grows to fit. Nothing about the node's own properties looks wrong in
isolation; the box is exactly as wide and tall as it was told to be.

**Detect it directly, not by eyeballing screenshots:**

```js
// Rough single-line height for this node's own font size/line-height.
function singleLineHeight(t) {
  const lh = t.lineHeight;
  if (lh.unit === "AUTO") return t.fontSize * 1.3; // approximate
  return lh.unit === "PIXELS" ? lh.value : t.fontSize * lh.value / 100;
}
const wrapped = texts.filter(t =>
  t.textAutoResize === "NONE" &&
  t.height > singleLineHeight(t) * 1.4   // more than ~1 line tall
);
```

A node that's supposed to be a single short label (a code, an abbreviation,
a status word) but reports a height of 2–3 line-heights is wrapping. Cross
its `characters` against its `width` at that `fontSize` to confirm — if the
unwrapped text is visibly wider than the box, that's the mechanism.

**Measured on a real file:** a SKU-code breakdown diagram had five 2–4
character labels (`FX`, `EV`, `9000`, `KK`, `ZZ`) each in a text node fixed
at ~14px wide — enough for one character, not two. Every one wrapped
mid-string (`FX` → `F` over `X`), and because the wrapped box grew taller
than the fixed row spacing around it, each wrapped label's second line
bled into the row below, producing a stack of overlapping single characters
that read as garbage.

**The fix depends on what the text is:**
- **A label that should always be one line** (a code, a select's current
  value, a nav item, a table cell): set `textAutoResize: "WIDTH_AND_HEIGHT"`
  if it can grow freely, or keep the fixed width but add
  `textTruncation: "ENDING"` with `maxLines: 1` so overflow shows `…` instead
  of wrapping. Do this **on the component definition**, not per instance —
  fixing the master fixes every instance at once, including future ones.
- **A label that's genuinely meant to wrap** (a paragraph, a description):
  leave `textAutoResize: "HEIGHT"` alone, but check the box is wide enough
  that wrapping happens at sensible word boundaries, not because the box is
  narrower than a single word.

**This bug is invisible to every other rule in this file.** Rules 4–6 check
font size and geometry; rule 12 checks line-height ratio; none of them look
at whether a text node's *own* box is wide enough for its *own* content.
Screenshot the full screen, not just the node — a wrapped label often looks
fine cropped tightly around itself and only reveals the collision against
whatever sits below it.

---

## Rule 14 — missing fonts block everything

**Run this first. Before layout, before unwrapping, before tokens.** A file can
reference a font that Figma does not have. Figma renders a fallback and says
nothing — but `loadFontAsync` throws, and *every* mutation on a text-bearing
subtree needs it. Auto layout on a frame containing that text: throws. Unwrap:
throws. Bind a text style: throws.

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

Measured on a real captured file: **1,180 of 1,323 text nodes (89%)** referenced
fonts Figma does not have — `Helvetica Neue` ×1,043, `Menlo` ×125, `Arial` ×6.

**Why a captured file is almost guaranteed to hit this.** The CSS was a *system
stack*:

```css
--font-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
```

The browser on the designer's Mac resolved that to `Helvetica Neue` and the
capture recorded the **resolved** name. Figma runs elsewhere and has none of
those macOS system fonts. The same happens with `font-mono` → `Menlo`, and with
`-apple-system`, `SF Pro`, `Segoe UI`.

> **Substituting a font is a visible change to thousands of nodes. Ask.**
> The font is *already* falling back, so the file does not look how it reads —
> but Figma's fallback and your substitute are not the same either. Present the
> mapping and let the human choose:
> - **Substitute** (`Helvetica Neue → Inter`, `Menlo → JetBrains Mono`) — unblocks
>   everything, and Figma's own error suggests Inter for Helvetica Neue.
> - **Install** the real fonts (Figma desktop + fonts on that machine) — keeps
>   the design honest to what production renders on a Mac.
>
> Check the style axis, not just the family: `Helvetica Neue` needed
> Regular/Medium/Bold — Inter has all three. A family that exists with the wrong
> styles still throws.
