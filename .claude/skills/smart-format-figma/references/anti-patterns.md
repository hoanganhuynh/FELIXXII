# Anti-patterns

| Don't | Why |
|---|---|
| Use `get_metadata` to check layout or type | It returns geometry only. It cannot see `layoutMode` or `fontSize` |
| Count SVG internals as violations | Buries 11 real issues under 72 fake ones |
| Fix leaves before roots | Parent auto layout moves the leaves again |
| Round geometry before applying auto layout | Auto layout recomputes it |
| Scale a frame to resize it | Drags type off the scale — this is where `9.83px` comes from |
| Report "38 violations" | Unactionable. Group by cause and give the path |
| Big-bang script over thousands of nodes | Fails atomically; you learn nothing about which part broke |
| Unwrap every single-text wrapper | Only 12% were empty. The rest carry padding, fill or sizing — you would restyle the file silently |
| Treat `clipsContent` as styling | 0 of 1,012 actually truncated. Test the effect, not the flag |
| Unwrap before the parent has auto layout | The freed text lands at an absolute position |
| Judge line height by its px value | 36px is fine at 24px type and absurd at 11px. Only the ratio means anything |
| "Fix" every ratio of 1.0 | On display type that is `leading-none`, chosen on purpose |
| Fix a 3.27 ratio by changing line height alone | It was centring the label. Without padding + `CENTER` on the parent, the text jumps to the top |
| Auto-layout a container whose children overlap | It is a layered composition. You will stack the background, header and sidebar and destroy the screen |
| Set `layoutWrap: WRAP` without a fixed width | The frame hugs to fit everything on one row. No error — the wrap just never triggers |
| Trust that a `.set()` with no error means the layout is correct | Verify by resizing and checking the reflow, not by the absence of a thrown error |
| Start editing before checking fonts exist | 89% of a real file's text was on missing fonts. Every text-touching op throws until that is resolved |
| Substitute a missing font silently | It restyles thousands of nodes. It is a visible change and needs consent |
| Sync tokens without a human gate | Irreversible at scale. The system is free to rebuild while nothing is bound to it |
| Tokenise every distinct colour found | 270 of them were `#ffffff @0%` — invisible. You would ship a token nobody can see |
| Invent a palette for a captured file | The hexes already *are* the code's tokens. Recover the names; don't create a rival set |
| Detect input fields by shape alone | 227 candidates from "bordered + wide" collapsed to 60 real ones once filtered by exactly-one-text-child and the designer's own naming |
| Build a Type × State variant grid at full cross-product | 4 × 5 = 20 variants when the file only ever uses a handful. Match the real cross-product |
| Add a width variant because the file shows many widths | 12 widths were 12 uses of one field, not 12 sizes. Use `FILL` sizing |
| Build one monolithic "Table" component | Column count varies per screen (6/7/9). The reusable unit is Row + Cell |
| Classify a cell as "stacked" from text-node count alone | Two TEXT nodes on the same y are inline (`Text+Meta`), not a second row (`Text+Sub`) — check `y`, not count |
| "Fix" a row height that differs from another table's | It's driven by its tallest cell's real content. Use HUG; don't force a shared fixed height |
| Redraw a badge inline inside a table cell | It's a nested pill with its own tones already matching the code's Badge component — make it its own component and slot it in |
| Assume a pill is a chip because it looks like one | Check for the colour-dot child. Same shape backs Chips, Tabs and (rectangular) nav items — three different selection models |
| Treat a missing chevron as cosmetic | It's the only thing that visually says "this is a dropdown, not a text field." 17/17 were missing it on a real file |
| Build the system before the structure is clean | You bind tokens to a tree you are about to rewrap |
| Pick an icon library (Lucide, Feather, Material Symbols…) when the file has none | It's a style decision with no signal in the file to base it on. Ask which set to reuse or import — don't default silently |
| Compute contrast assuming a white background | Text sitting on a coloured card or dark section will read as passing when it's actually failing |
| Contrast-check text on a photo or gradient | The background isn't one colour — a single ratio number is meaningless there. Flag for manual review instead |
| Merge two corner radii because they happen to measure the same | A card and a badge landing on the same px by coincidence are still two different roles — check what the shape is before collapsing the scale |
| Leave a new component floating off-canvas next to the screen it was built for | It gets lost. Move it to the Components page, in its named Section, as the last step of building it |
| Call componentization done because every on-screen instance now maps to a component | The file can be missing an entire component family (e.g. Button) with zero individual violations to detect — cross-check the codebase's own component list, not just what repeats on screen |
| Build a component's library-page documentation to match only what's on screen | The library page is the component's full intended range (every variant × state), not a screenshot of current usage — that's the one place the full cross-product belongs |
| Convert a GROUP to a FRAME by copying `group.x/y` and trusting children keep their visual position | Groups of same-size overlapping shapes (rings, arcs) can report a bounding box that doesn't match children's true local origin — verify by absolute position, not by the numbers looking plausible |
| Treat a node-scoped screenshot as proof nothing broke | It only shows the node in isolation — it can't reveal that the node's content now overlaps something elsewhere on the same screen. Screenshot the whole screen too |
| Defer the contrast rule indefinitely because nothing in the node tree "looks" broken | A real file had a 1.5:1 ratio (functionally invisible text) sitting unnoticed through several rounds of other fixes. Missing-font and broken-layout bugs are visible in the tree; contrast failures aren't — that's exactly why deferring it is dangerous |
| Assume font size and line-height checks catch every text problem | A text box can be fully valid on those two axes and still silently wrap mid-word because its fixed width is narrower than its own content — a distinct failure mode (rule 24), invisible to rules 4/5/12 |
| Skip the orphan-node sweep at the end of a session | Failed or partial operations can leave debris sitting outside the known screen structure (e.g. at `(0,0)`) — no per-screen check will ever find it because it isn't inside any screen |
| Bind an icon's stroke straight to a `text/*` semantic variable | Works today, but conflates two things that may need to diverge later. Give icons their own `icon/*` set aliasing the same primitive |
| Bind a scrim/overlay to the same opaque variable a logo or icon uses, then set per-instance paint opacity to fake transparency | The variable itself carries no "this one is transparent" signal — any other opaque use bound to it inherits the scrim's fade the moment someone reuses the variable. Bake the alpha into its own `alpha/*` variable instead |
| Recover a colour token from a 6-digit hex without checking the source for an 8-digit one | `#a8536018` is a colour *and* a 9% alpha, flattened to a solid pink by any web capture. Binding the recovered value at full opacity turns a pale wash into a mid-saturation surface — and fails contrast for anything dark on top of it |
| Snap each fractional spacing value to the nearest scale step independently | `20.85`, `20.35`, `20.96`, `20.74` are four capture-noise variants of one real decision. Cluster near-duplicates first, then pick one scale step for the whole cluster — snapping each independently can scatter one decision across two or three different steps |
| Count every `Group`/`Frame 427`/`Vector` hit as a real naming violation | Most hits inside an icon or logo import are vector-path internals, not real layers — exempt them the same way every other rule exempts SVG internals, or the count is mostly noise |
| Leave a rule in the table with no reference-file detail or detector | A rule that exists only as one row in a table gets silently skipped — rules 7 and 9 sat undocumented since the skill's first draft and were never actually run on a real file as a result |
| Build a labeled field as a loose caption text next to a Field instance | It's a repeated pairing (rule 10) rebuilt by hand every time. Make it its own component with a boolean "Has label" property |
| Swap a child inside a `GRID` auto-layout frame the same way as any other layout mode (`remove` + `createInstance` + `insertChild`) | `insertChild` doesn't preserve `gridRowAnchorIndex`/`gridColumnAnchorIndex` — the new instance lands wherever Figma defaults it, silently scrambling the grid. Record the position first, restore it with `setGridChildPosition` after |
| Set `gridRowAnchorIndex`/`gridColumnAnchorIndex` directly | They're read-only. The mutation API is the method `setGridChildPosition(row, col)` |
| Move grid children straight to their final target positions during a bulk reposition | Whichever target cell is still occupied by the *old* layout throws "occupied by another node." Park everything in temporary empty rows first, then move each into its real target |
| Build a container as N variants where the only difference between them is which single child is in which state | The child already owns that state as its own variant. Build one container holding instances of the child, and mark each nested instance `isExposedInstance = true` so it's directly editable per-use instead of pre-baking every combination |
