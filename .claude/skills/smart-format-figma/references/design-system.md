# Rule 13 in detail — the design system

This is the only rule that **writes at scale** and the only one with a
**mandatory human gate**. Treat it as three separate jobs, in order.

## Step 1 — Inventory (read-only)

```js
const paint  = await figma.getLocalPaintStylesAsync();
const text   = await figma.getLocalTextStylesAsync();
const cols   = await figma.variables.getLocalVariableCollectionsAsync();
// plus: count fills whose boundVariables is empty, and text whose textStyleId is unset
```

Answer two questions before touching anything:
1. **Is there a system?** `get_variable_defs` returning `{}` is a strong hint,
   but check paint/text styles too — a file can have styles and no variables.
2. **How big is the sync?** Distinct colours, distinct type combos, and how many
   nodes are raw. This sizes the job and catches the traps below.

Measured on a real captured file: **0 paint styles, 0 text styles, 0 variable
collections, 0 bound fills, 2,202 raw fills, 1,323 unstyled texts, 39 distinct
colours, 34 distinct type combos.** A pure greenfield.

### Two traps that break a naive "collect the distinct values" pass

| Trap | What it looks like | Do |
|---|---|---|
| **Invisible fills** | `#ffffff @ 0%` — **270 of them** here | Fully transparent. It paints nothing. **Delete it, never tokenise it** — otherwise the palette gains a "white" that no one can see |
| **The hexes are already tokens** | `#948b7d` ×599, `#1c1917` ×585, `#7c1f2b` ×59, `#f6f2ea` ×35 | In a web-captured file these **are the codebase's tokens**, flattened. Recover the existing names (`ink-soft`, `ink`, `accent`, `bg`) — do **not** invent a new palette next to the one that already ships |

The same applies to type: `Helvetica Neue 12/16` ×467 is the app's body style,
not a coincidence. Read the source's tokens (`src/index.css`, tailwind config)
and name the Figma variables to match. **A design system that disagrees with the
code's token names is a second source of truth, i.e. the problem you were
solving.**

#### The 8-digit-hex trap — a code token can carry alpha the flattened fill lost

When recovering a colour token from the code, **read the full hex string, not
just the first 6 digits.** A CSS value like `--color-accent-soft: #a8536018`
is 8 digits: `#a85360` (the colour) + `18` (the alpha byte, `0x18/255 ≈ 9%`).
It's a colour meant to be painted at ~9% opacity — a pale wash.

A web capture flattens that wash against whatever was behind it, so the
*rendered* pixel the capture recorded is a solid pale pink — and the naive
recovery pass tokenises that solid pink, or worse, tokenises the raw
`#a85360` at full opacity. Bind that full-opacity version as a card's
background and you get a **mid-saturation bordeaux surface**, not the pale
wash the code intended — and any dark text on it fails contrast (this is
exactly how a "Bridal drives margin" card ended up with 1.5:1 body text).

**The fix:** when a recovered code token is an 8-digit hex (or an
`rgba()`/`hsla()` with alpha < 1), create the Figma variable with the alpha
baked into the value — `setValueForMode(mode, { r, g, b, a })` — following
the same `alpha/*` discipline as scrims. A `#a8536018` code token becomes a
COLOR variable at `a: 0x18/255`, and every surface bound to it is the pale
wash by construction. Grep the source for the token's literal value before
tokenising; the alpha byte is invisible once the colour is flattened, so the
only place to recover it is the code.

## Step 2 — Build the system (write) — then STOP

Scale must follow **Material 3** or **Ant Design**. Pick one and say which.

| | Material 3 | Ant Design |
|---|---|---|
| Type | Display 57/45/36 · Headline 32/28/24 · Title 22/16/14 · Body 16/14/12 · Label 14/12/11 | Heading 38/30/24/20/16 · Base 14 · Small 12 |
| Colour | Tonal palettes, tones 0–100 | 10-step palettes (1–10) from one seed |
| Fits when | Product has a broad type range, needs theming/tonal surfaces | Dense admin/data UI, tight scale |

Reconciling a measured scale against the standard is a **judgement call, not a
mapping**. This file measured 11 distinct sizes (10, 11, 12, 13, 14, 15, 16, 18,
20, 24, 30) — neither standard has 11 steps. Compressing them is exactly the
decision the human must sign off. Note the collisions explicitly: e.g. rule 4
sets a 10px floor, Material's smallest label is 11 and Ant's smallest is 12 — so
**every 10px node moves**. That is a visible change and needs consent.

Structure to build:

```
Collections
  ├── Primitives   (raw ramps: bordeaux/1..10, neutral/1..10)  — scopes: SHAPE_FILL, FRAME_FILL
  └── Semantic     (bg, ink, ink-soft, accent, line → alias into Primitives)
Text styles
  └── One per scale step, named for its ROLE (body/md, label/sm), not its size
```

Rules while building:
- **Alias, don't duplicate.** Semantic variables point at primitives. A raw hex
  in the semantic layer defeats the layer.
- **Set `scopes` explicitly.** The default `ALL_SCOPES` pollutes every picker.
- **≤10 operations per call**, validate between.
- **Return every created id.**

### Naming convention — a numbered tonal scale beats a flat name set

Measured against a real commercial kit's variable set (`get_variable_defs` on
a shipped SaaS admin kit): every semantic colour variable used a
**`role/weight-tone`** pattern — `text/strong-950`, `text/sub-600`,
`text/soft-400`, `bg/weak-50`, `bg/white-0`, `bg/soft-200`,
`stroke/soft-200` — a tonal number (Tailwind-shaped, roughly 50 = near-white
to 950 = near-black) rather than a flat name like `ink` / `ink-soft`.

**Why this beats flat names**, concretely: a flat set (`ink`, `ink-soft`) has
nowhere to put a third tone if the file later needs one — you either overload
an existing name or invent an unrelated third word. A numbered scale
(`text/strong-950`, `text/sub-600`, `text/soft-400`) has open steps between
and around every existing one; adding `text/soft-300` later doesn't force
renaming anything.

**Renaming an already-bound variable is safe** — Figma bindings follow the
variable's id, not its name, so `variable.name = "text/strong-950"` on a
variable already bound to 2,000 nodes does not touch a single binding. This
makes the tonal rename a good **retrofit**, not just a greenfield choice: if
an earlier pass already built `ink`/`ink-soft`-style flat names, renaming to
the tonal convention afterward is low-risk and worth doing.

### Icons get their own token category, separate from text

The same reference kit had `icon/strong-950`, `icon/sub-600`,
`icon/soft-400` as **distinct variables from `text/strong-950` etc.**, even
where the colour values matched at build time. Reusing the text token
directly for icon strokes (binding a chevron's stroke straight to
`text/sub-600`) works visually but conflates two things that may need to
diverge — a future theme could want icons a shade lighter than body text
without touching every text node, and can't if they share one variable.

Create `icon/*` as its own semantic set, aliasing the **same primitive**
`text/*` currently points to (so today's colour is identical), then rebind
every icon `VECTOR` stroke from `text/*` to `icon/*`. Do this as a distinct
pass after the main sync — find every vector whose bound stroke color id
matches a text/bg semantic variable and known to sit inside an icon instance,
and re-point it.

### Alpha tokens — bake transparency into the variable, not the instance

The same kit stored `alpha/white/alpha-60`, `alpha/white/alpha-10` as COLOR
variables with the opacity baked into the value itself (`#ffffff99` = white
at 60%), rather than binding a solid colour and setting the *paint's*
opacity per instance. Figma variables of type COLOR support an alpha channel
directly: `variable.setValueForMode(modeId, { r, g, b, a })`.

**This is the fix for a real, once-made mistake:** binding a raw solid black
to an `overlay` semantic variable and then setting `opacity: 0.3` on each
paint separately is exactly how a logo's fill (also raw black, but meant to
stay **opaque**) can get bound to the same "overlay" variable and inherit a
scrim's transparency — the variable itself carried no information that it
was "the 30%-transparent one." Baking the alpha into the variable
(`alpha/black/alpha-30`) removes the ambiguity: a scrim binds to
`alpha/black/alpha-30` and is *always* 30% by construction; a logo binds to
`static/static-black` (opaque) and can never accidentally inherit a scrim's
transparency, because they are different variables with different values,
not the same variable plus a per-instance opacity override.

Recover the exact alpha values from the codebase (`bg-black/20`,
`bg-black/25`, `bg-black/30` in Tailwind classes → three distinct alpha
variables), the same way rule 13's colour recovery works for solid tokens —
don't invent one "the" overlay opacity if the code uses more than one.

### A Style Guide page — the visual counterpart to the Components page

Rule 23's Components page shows what each *interactive* piece looks like
(Button, Field, Badge). A separate **Style Guide page** shows the raw
*tokens* themselves as swatches — colour, type, spacing, radius, shadow,
opacity — one labeled Section per category, same organizing principle as the
Components page (Sections in a loose grid, never floating loose on a screen).

Build each section from what the file's audit already measured, not from
guessed values:

| Section | Source |
|---|---|
| Colors | Every Primitive/Semantic colour variable, as a swatch + its variable name |
| Typography | One row per text style: sample string set in that style, name + size/line-height as a caption |
| Spacing | A scale **derived from the real spacing histogram** (rule 7) — the file's actual most-common gap/padding values snapped to a clean ramp (e.g. 4/8/12/16/20/24/32/40), not an invented scale |
| Corner Radius | The radius variables from rule 22, as sized boxes |
| Shadows | Real effect styles, **grounded in the file's own measured `effects` values** (see below) — not a generic elevation ramp |
| Opacity / Alpha | The `alpha/*` tokens (see above), swatched over a checker backdrop so the transparency is actually visible — a flat-colour swatch behind an alpha value shows nothing |
| Borders | Real stroke-weight values found in the file, snapped to a clean 1–2 step scale |

**Measure shadows the same way as colour** — group every node's `effects` by
`(type, radius, offset, spread, color, alpha)` and count. A real file had
exactly three recipes in use: a `spread:1, blur:0` "ring" at 10% black (used
~160 times — closer to a border simulated as a shadow than a drop shadow),
a similar ring at 15% in a warm stone tint (badge rings), and one real
soft elevation shadow (`blur:50, y:25, spread:-12` at 25% black, ~9 uses —
almost certainly the modal/dropdown shadow). Build effect styles for exactly
those three, alias their colour to `alpha/*` variables, and don't invent a
5-step elevation ramp the file never used.

**Checker backdrop for opacity swatches is not decoration.** A semi-transparent
swatch painted directly on the page's own background can look identical to
several different alpha values if the background happens to be light — the
checker pattern is the only way the eye can actually judge how transparent a
swatch is.

**Section layout is a real layout problem — measure heights before
positioning.** Sections built one at a time with hand-picked `x`/`y`
coordinates will overlap once a section turns out taller than guessed (e.g.
a 9-step Spacing list is taller than a single row of radius swatches).
Position every section from its **actual measured `width`/`height`** after
building it, not from an assumed grid — same principle as rule 6, applied to
page layout instead of node geometry.

### Static tokens — for values that must not follow the theme

If the file has (or will have) a dark-mode counterpart, some values need to
stay fixed regardless of mode — the reference kit's `static/static-black` /
`static/static-white`. Anything a Figma mode-switch shouldn't touch (a fixed
scrim colour under both themes, a brand mark's ink) belongs in a `static/*`
namespace, separate from the semantic tokens that DO switch per mode.

> ### 🛑 Gate — do not cross without a human
>
> When the system exists but **before a single node is re-bound**: stop, post
> the link, and wait.
>
> Report: the standard chosen and why · the full scale with the source→scale
> mapping · every value that had to move (especially the 10px floor) · the traps
> found and how they were handled (transparent fills deleted, code token names
> recovered) · what sync will touch (`2,202 fills, 1,323 texts`).
>
> **Sync is irreversible at this scale.** Approving a palette costs a minute;
> unpicking a wrong one costs the file. Building the system is cheap to redo
> while nothing is bound to it — that is the entire reason the gate sits *here*
> and not after.

## Step 3 — Sync (write) — only after approval

Bind fills to variables, apply text styles, delete the invisible fills. Then
**re-run the inventory**: `fills_raw` and `text_unstyled` must approach zero.
That number is the proof, not a screenshot.
