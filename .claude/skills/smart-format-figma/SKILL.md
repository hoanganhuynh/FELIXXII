---
name: smart-format-figma
description: Audit and clean up a Figma design file itself — auto layout, grouping, type scale, spacing, corner radius, colour tokens, contrast, fonts, icons, and component discipline (inputs, nav, tabs, tables). Use whenever asked to standardise, format, tidy, lint, or QA a Figma design, or to bring a rough/captured Figma file up to the quality of a commercial UI kit ("chuẩn hoá thiết kế", "check auto layout", "dọn file Figma", "làm cho giống UI kit"). This inspects and repairs the design file itself; it does not write application code and does not judge whether the data or copy shown in the design is correct.
---

# Smart Format Figma

A linter for a Figma file. Rules → audit → fix → verify.

## Scope

**In scope:** structure and craft of the design file — layout, hierarchy, type,
geometry, colour, contrast, icons, naming, component discipline.

**Out of scope:** whether the numbers, copy or data in the design are right, and
whether the code matches. A mockup showing "9197%" is not this skill's problem.
Judge the *construction*, not the *content*.

---

## The rules

Severity: **P1** blocks handoff · **P2** fix before sign-off · **P3** polish.

| # | Rule | Sev | Why |
|---|------|-----|-----|
| 1 | Every **flow** container with >1 child uses **auto layout**. Layered containers (children overlap) stay absolute | P1 | Hand-placed children don't reflow. But auto layout on a layered composition stacks what was meant to overlap — it destroys the screen |
| 2 | **No `GROUP`** for layout | P1 | A group has no padding, no spacing, no resizing rules. It is a selection, not a container. Use a frame |
| 3 | **Text is never inside a group** | P1 | Grouped text can't hug, wrap or align. It is positioned by accident |
| 4 | Font size **≥ 10px** | P1 | Below 10 is illegible on screen and fails at any real viewing distance |
| 5 | Font size is an **integer**, from the type scale | P2 | `9.828736` is a scaling artifact, not a decision. Fractional type never renders crisply |
| 6 | Width/height/x/y are **whole pixels** | P2 | Fractional geometry blurs edges and betrays a capture rather than a design |
| 7 | Spacing/padding from the **spacing scale** | P2 | Arbitrary gaps make the rhythm unreproducible in code |
| 8 | Colours/type/effects bound to **variables or styles** | P2 | Raw hexes can't be themed and drift instantly |
| 9 | Layers **named meaningfully** | P3 | `Frame 427`, `Group`, `a` cost the next reader real time |
| 10 | Repeated UI is a **component**, not a copy | P2 | Copies diverge silently |
| 11 | **A container wrapping a single text node is redundant** — unwrap it. 2+ children: keep | P2 | One `<div>` per string is a DOM habit, not a design one. It doubles the tree and buries the real structure |
| 12 | **Line height must be proportional to font size** — ratio inside the band for its role, never < 1.0 | P1 | A line height set in absolute px stops tracking the type. Under 1.0 glyphs collide; far above it the text box is no longer about the text |
| 13 | **All type and colour bound to the design system.** No system in the file → build Variables + Styles first (Material 3 or Ant scale), **get it approved**, then sync | P1 | Raw values cannot be themed, audited or handed off. And a system built on the wrong scale is worse than none — it makes the wrong thing permanent |
| 14 | **Every font the file references must exist in Figma** — resolve before any other text work | P1 | A missing font renders as a silent fallback, and **blocks every edit**: any op touching that text must load its font first, and loading throws |
| 15 | **Every input field is one master Component**, variants for type/state, lean property set | P2 | Hand-drawn form fields drift pixel-by-pixel; a component makes every field the same box by construction |
| 16 | **Repeated nav items are one Component**, state as a variant | P2 | Same reasoning as rule 10, specific enough to name: a sidebar redrawn per screen drifts pixel-by-pixel across screens |
| 17 | **Table is Row + Cell components, never one monolithic "Table"** | P2 | Column count varies per screen. One flat Table component forces every screen into the same columns or forks into near-duplicates |
| 18 | **A `Select` field must carry its trailing chevron** — an affordance-less dropdown is indistinguishable from a text input | P1 | Measured 100% missing on a real file (17/17). A control that doesn't look interactive doesn't get clicked |
| 19 | **Segmented single-select (Tabs) is its own component** — distinct from multi-select chips (rule 10) and nav items (rule 16) by construction, not just label | P2 | Same pill shape can back three different interaction models. Conflating them into one component either loses a state or gains one that shouldn't exist |
| 20 | **No icon component set in the file → ask before doing anything about it.** Never pick or import an icon library on your own. Ask whether an icon set already exists elsewhere (a library, a prior file) or which URL/set to use | P1 | Icons are a visual-language decision, not a construction fix. Guessing a set (Lucide vs Material vs Feather) bakes in a style choice the human never made, and it's expensive to unpick once instances are placed everywhere |
| 21 | **Text/icon colour vs. its background meets WCAG contrast** — ≥4.5:1 for body text, ≥3:1 for large text (≥18px, or ≥14px bold) and for icons/UI graphics | P1 | Illegible text is a functional defect, not a style nit. A raw hex that fails contrast will keep failing after it's tokenised — catch it before it's baked into a semantic colour |
| 22 | **Corner radius comes from its own small scale**, not copied ad hoc per shape — distinct from the spacing scale (rule 7) | P2 | UI kits ship a radius ramp (e.g. `4 / 8 / 12 / full`) mapped to role (input/button vs card vs pill), same discipline as the type scale. Freehand radii drift the same way freehand spacing does |
| 23 | **Components live on their own page**, grouped into named Sections (one per family), not left floating beside the screen they were extracted from. Before calling the set "done," **cross-check the codebase's own component list** (e.g. `Button`, `Badge`, `Card`) for families the file never drew at all | P2 | A component built next to its source screen gets lost and redrawn from scratch next time someone needs it. And an audit that only fixes what's already on-screen silently ships without the pieces the app is missing — the codebase's own component file is the ground truth for what "done" means, not the screens that happened to get captured |
| 24 | **A text node with a fixed width narrower than its own unwrapped content silently wraps** — mid-word, character by character, spilling into whatever sits below it | P1 | Invisible in isolation (the node's own bounds still look plausible) and invisible to every geometry/font-size check that already exists — only a rendered screenshot shows the collision. Measured on a real file: a "FX" label wrapped to "F" over "X", overlapping the row below it |
| 25 | **After componentizing a repeated leaf, componentize the repeated container too** — if the block holding the leaves is identical across screens (a sidebar, a toolbar), it's a repeated unit at the block level | P2 | Rule 10/16 catch the leaf; the container that repeats it verbatim on 8 screens is the level easiest to miss because componentizing its children feels like finishing the job. Left hand-assembled, the nav must be edited in 8 places |
| 26 | **CTAs and indicators use the icon set, not typographic glyphs** (`←`, `→`, `▲`, `▼`, a literal `+` in a label) | P2 | A glyph renders (it's in the font) so no font/geometry check flags it, but it's wrong weight, wrong grid, no swap slot, and breaks when the typeface changes. It belongs in an icon slot as a real icon instance |
| 27 | **A library component's property schema must be complete** — Variant × Size × State plus Leading/Trailing icon booleans (+swap slots) and a Label TEXT property; the label references a text style, never a detached override | P2 | "Match the observed cross-product" (rules 15/16/19) governs *fixing a screen*; a *library* component is measured against commercial kits, which expose every structural option as a named property. A missing Size axis or a detached label makes the component incomplete regardless of what the screens use |

> The rule set is meant to grow. Add rows, give each a severity, a detector and
> a fix. Keep `references/audit-script.md` in sync.

---

## Reference files — load the one you need, not all of them

Each rule's full reasoning, measured evidence, and detection code lives in
`references/`. Load only the file relevant to the rule(s) in play; don't pull
all of them into context up front.

| File | Covers | Load when |
|---|---|---|
| `references/audit-script.md` | The Phase 1 read-only audit script (rules 1–14 core checks), extra snippets for rules 7/9/14/20/21/22/24, and how to read the output | Always, at the start of any audit |
| `references/layout-and-wrappers.md` | Rule 1 (auto layout vs. layered/overlap gate, `layoutWrap` gotcha), Rule 2 (GROUP→FRAME position-verification gotcha), Rule 11 (classifying single-text wrappers) | Fixing layout or unwrapping containers |
| `references/typography-and-fonts.md` | Rule 12 (line-height ratio bands, CSS centering-hack signature), Rule 14 (missing fonts, substitution gate), Rule 24 (fixed-width text boxes that silently wrap) | Any text-touching work |
| `references/spacing-and-naming.md` | Rule 7 (spacing scale — histogram clustering method), Rule 9 (meaningful layer names, SVG-internal exemption) | Tokenising spacing, or a final naming pass |
| `references/components.md` | Rule 10 (general repeated-UI catch-all, structural-fingerprint detection), 15 + 18 (input fields, chevron), 16 (nav items), 19 (tabs vs chips vs nav), 17 (tables as Row + Cell), 23 (component library page/Section organization, gap-checking against the codebase), 25 (componentizing the repeated container, not just the leaf), 26 (real icons vs. typographic glyphs), 27 (a library component's full property schema) | Componentising repeated UI |
| `references/icons-and-accessibility.md` | Rule 20 (icon set — ask, don't guess), Rule 21 (contrast — including why it's easy to defer), Rule 22 (corner-radius scale) | Icon work, colour/contrast pass, or radius cleanup |
| `references/design-system.md` | Rule 13 — the only rule that writes at scale and has a **mandatory human gate**; also the 8-digit-hex alpha trap, tonal token naming, `icon/*` and `alpha/*` token categories, static tokens, and the Style Guide page | Building or syncing Variables/Styles, or presenting the token system |
| `references/anti-patterns.md` | Full "don't do this, here's why" table, one row per rule | Before starting a fix pass, as a final sanity check |

---

## Phase 1 — Audit (read-only)

`get_metadata` only returns `id / name / type / x / y / width / height`. It
**cannot** see `layoutMode`, `fontSize`, fills or bindings — so it cannot answer
most of these rules. Use the **Plugin API** via `use_figma`.

Load the `figma-use` skill first (its rules are mandatory), then load
`references/audit-script.md` and run its script against the target node. It
writes nothing. Record the counts as a baseline before touching anything.

---

## Phase 2 — Fix

**Order matters. Working outside-in prevents most of the churn.**

0. **Fonts first (rule 14).** Nothing that touches text can run until every
   referenced font loads. This gates every step below.
1. **Roots first.** Auto layout on the **flow** frames — never the layered ones.
   Most child misalignment resolves once the parents drive layout.
2. **Groups → frames.** Do this before layout: you cannot auto-layout a group.
3. **Unwrap redundant wrappers** (rule 11). Only once the parent has auto
   layout — an unwrapped text dropped into a layout-less parent lands at an
   absolute position.
4. **Then type.** Snap to the scale, raise anything under 10.
5. **Then the grid — geometry, spacing, and corner radius (rules 6/7/22).**
   Round/cluster last; auto layout recomputes sizes, so doing this first is
   wasted work. Cluster the spacing histogram (rule 7) before picking a scale
   — don't snap each fractional value independently.
6. **Then icons (rule 20) and contrast (rule 21).** Icons need the human's
   answer on which set to use before any instance-swap slot can be filled;
   contrast needs stable fills to check against. Don't defer rule 21 — it has
   no visible symptom in the node tree, which is exactly why it's the rule
   most likely to get silently skipped across sessions.
7. **Naming last** (rule 9) — cosmetic, but give it an actual pass, not just
   a mention in the plan; exempt SVG/icon internals or the count is mostly
   noise.
8. **Components, then the library page (rules 10/15–19/23/25–27).** Fix
   components the file has, then check the codebase's own component list for
   families it never drew at all (rule 23), then check whether the container
   holding a componentized leaf is itself repeated (rule 25). Move everything
   to its own page in named Sections as the last step of building it, not
   later.
9. **Design system (rule 13) is its own phase, not a step.** It writes to
   thousands of nodes and needs sign-off. Run it after the structure is clean —
   binding tokens to a tree you are about to restructure is wasted work.

Non-negotiables while fixing:

- **Never "scale" a frame to resize it.** That is what produced `9.83px`. Resize
  the frame and let auto layout reflow.
- **≤10 operations per `use_figma` call.** Validate between calls. A 4,800-node
  file punishes big-bang scripts.
- **`layoutSizingHorizontal/Vertical = 'FILL'` only *after* `appendChild`.**
  Before it throws.
- **`use_figma` is atomic.** A failed script changed nothing — read the error,
  fix, retry. Do not blind-retry.
- **Return every mutated node id.** You need them to verify or roll back.

---

## Phase 3 — Verify

1. **Re-run the audit.** Compare counts against the baseline. This is the proof.
2. **Screenshot before/after** at the same `maxDimension`. Cleanup must not
   change how it looks — if it does, layout was applied wrongly.
3. **Resize a root frame.** If children reflow, auto layout is real. If they
   don't, it isn't.
4. **Screenshot every full screen, not just the nodes you touched.** A
   node-scoped screenshot only proves that node looks right in isolation —
   it cannot show that something you moved now overlaps an unrelated
   element elsewhere on the same screen (rule 2's donut-over-legend bug was
   invisible until a full-screen shot caught it, days of work later).
5. **Sweep for orphaned nodes** — list every direct child of the page that
   isn't part of the known screen/section structure. Failed or partial
   operations (an instance-replacement error, an aborted script) can leave
   debris sitting at `(0,0)` or off-canvas; it won't show up in any
   per-screen check because it isn't inside any screen.

---

## Checklist

- [ ] `figma-use` skill loaded before any `use_figma`
- [ ] Node found by walking pages (context resets each call)
- [ ] Audit run **read-only** first; counts recorded as a baseline
- [ ] SVG/icon internals exempted from layout + grid rules
- [ ] **Overlap checked before flagging any missing auto layout** — layered ≠ broken
- [ ] Any `layoutWrap: WRAP` frame has an explicit **FIXED** width, and wrap was **proven** by resizing (not assumed from a clean `.set()` call)
- [ ] Findings reported with **path and severity**, not bare counts
- [ ] Line height judged as a **ratio**, per role band — px values ignored
- [ ] Fixed outside-in: fonts → layout → groups → unwrap → type → grid/radius → icons/contrast → naming → design system
- [ ] Audit re-run; every count moved in the right direction
- [ ] Before/after screenshots identical in appearance
- [ ] A root frame resized to prove auto layout is live
- [ ] **Fonts checked against `listAvailableFontsAsync` before any edit** — family *and* style
- [ ] Font substitutions approved by the human, not chosen silently
- [ ] Input fields detected by **one text child + border**, not shape alone; false-positive chips/buttons excluded
- [ ] Component built with the **real** observed cross-product of Type/State, not the full grid
- [ ] Nav/menu items componentized with the real state count found (no invented states)
- [ ] Table treated as **Row + Cell**, never a single monolithic component
- [ ] Row/Cell reuse checked **per screen** — an existing `Row`/`Cell` component elsewhere in the library does not mean a given table uses it; a table added after the library was built can still be 100% hand-drawn frames (measured: 15 hand-built rows next to a fully componentized `Row`/`Cell` set, in the same file)
- [ ] Rule 10's general structural-fingerprint scan run (not just the named-pattern checks for input/nav/table/tabs) — catches repeated UI that doesn't match any of those specific shapes (measured: a 6-row ranked list, `rank + stacked name/meta + value`, invisible to every other detector)
- [ ] Every `Select`-type field has its trailing chevron — checked per instance
- [ ] Design system inventoried **before** building (styles AND variables)
- [ ] Token names recovered from the codebase, not invented
- [ ] 🛑 **Human approved the system in Figma before any node was re-bound**
- [ ] Post-sync inventory re-run: `fills_raw` / `text_unstyled` ≈ 0
- [ ] Icon components checked before any icon work; if none exist, **asked the human** which set to reuse or import rather than picking one
- [ ] Text/icon contrast checked against its actual painted background, not assumed white; photo/gradient backgrounds excluded from the automated check
- [ ] Corner radii collected into a histogram before touching any; long-tail values snapped to the nearest observed step, not merged across different shape roles
- [ ] Components moved to their own page, grouped into named Sections per family — not left floating in negative space beside the screen they came from
- [ ] Codebase's own component inventory checked for families the file never drew (e.g. `Button`) before calling componentization done
- [ ] Colour tokens use a numbered tonal name (`text/strong-950`) rather than flat names (`ink`) where practical — safe to rename after the fact, bindings follow the variable id
- [ ] Icon strokes bound to their own `icon/*` tokens, not reused directly from `text/*`
- [ ] Any baked-in transparency (scrims, overlays) uses an `alpha/*` variable with the opacity in the value itself, not a shared opaque variable plus a per-instance paint opacity
- [ ] A Style Guide page exists alongside the Components page, showing tokens as swatches (colour, type, spacing, radius, shadow, opacity) — spacing and shadow sections grounded in the file's own measured histograms, not invented ramps
- [ ] Style Guide sections positioned from their actual measured width/height after building, not from a hand-picked grid that can overlap
- [ ] Any GROUP→FRAME conversion verified by absolute position, not just by copying the group's reported x/y — especially for groups of same-size overlapping shapes (rings, arcs)
- [ ] Text nodes checked for silent wrap (`textAutoResize: NONE` + height > ~1 line) — not just font size and line-height ratio
- [ ] Full-screen (not just node-scoped) screenshots taken as final verification, and the page swept for orphaned nodes outside the known screen structure
- [ ] Recovered code colour tokens checked for 8-digit hex / `rgba` alpha — semi-transparent tokens built as `alpha/*` variables with baked alpha, not flattened to a solid
- [ ] After componentizing leaves, the container holding them checked for verbatim repetition across screens and componentized if repeated (e.g. the whole sidebar, not just its nav items)
- [ ] That container is **one component** with nested leaf instances (`isExposedInstance = true` on each), not N variants reproducing "which child is active" — the leaf already owns that state
- [ ] A genuine two-state toggle variant (selected/not — nav items, tabs, checkboxes) is named `On`/`Off`, not a domain word pair — reserve descriptive names for axes that are a real category, not a plain toggle
- [ ] No CTA or indicator uses a typographic glyph (`←→▲▼`, literal `+`) as an icon — all use real icon-set instances in a slot
- [ ] Library components carry a complete property schema (Variant × Size × State + icon booleans/swaps + Label text property); labels reference a text style, not a detached override
- [ ] Spacing histogram collected and **clustered** before picking a scale (rule 7) — fractional near-duplicates of the same value merged, not each snapped independently; tokens bound, not just rounded
- [ ] Layer-naming pass actually run (rule 9), not just deferred to "later" — SVG/icon internals exempted so the count reflects real violations
- [ ] Skill self-audit: every rule in the table has a reference-file section with a detector, not just a table row — a rule with no detail is a rule that will get silently skipped
- [ ] A labeled form field (caption + control) is its own component with a boolean "Has label" property, not a loose `[text, Field instance]` pairing rebuilt per instance
- [ ] Any node swap inside a `layoutMode: "GRID"` frame recorded the child's `gridRowAnchorIndex`/`gridColumnAnchorIndex`/spans first and restored them via `setGridChildPosition` (parking in temporary empty rows to avoid "occupied" errors) — `insertChild` alone does not preserve grid position

Full detail on each item lives in the matching `references/` file above; this
list is the pre-flight/post-flight check, not the explanation.

See `references/anti-patterns.md` for the full "don't do this" table.
