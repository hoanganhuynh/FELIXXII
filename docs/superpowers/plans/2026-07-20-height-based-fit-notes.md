# Height-Based Fit Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a height-based length note ("runs shorter/longer for you") to the existing size recommendation, independent of the bust/waist/hip size pick.

**Architecture:** `SIZE_CHART` rows gain a `height: [number, number]` reference range (cm). `recommendSize()` compares the customer's height against the chosen size's range and appends one directional note to the existing `notes` array — no new UI, since `Product.tsx` already renders `rec.notes.join("; ")`.

**Tech Stack:** TypeScript, no new dependencies. No automated test suite in this project — verification is manual via the browser (localStorage-seeded body profile + product page).

**Reference spec:** `docs/superpowers/specs/2026-07-20-height-based-fit-notes-design.md`.

---

### Task 1: Add reference height ranges and the length note

**Files:**
- Modify: `src/data/sizing.ts`

- [ ] **Step 1: Add `height` to `SizeRow` and each `SIZE_CHART` row**

Replace:
```ts
export interface SizeRow {
  size: string;
  bust: [number, number]; // cm
  waist: [number, number];
  hip: [number, number];
}

/** SEN atelier size chart (cm) */
export const SIZE_CHART: SizeRow[] = [
  { size: "S", bust: [78, 84], waist: [60, 66], hip: [84, 90] },
  { size: "M", bust: [85, 90], waist: [67, 72], hip: [91, 96] },
  { size: "L", bust: [91, 97], waist: [73, 79], hip: [97, 103] },
  { size: "XL", bust: [98, 104], waist: [80, 86], hip: [104, 110] },
];
```
with:
```ts
export interface SizeRow {
  size: string;
  bust: [number, number]; // cm
  waist: [number, number];
  hip: [number, number];
  /** reference height range this size's garment length is cut for (cm) —
   *  not a sizing criterion, only used to flag a length-fit note */
  height: [number, number];
}

/** SEN atelier size chart (cm) */
export const SIZE_CHART: SizeRow[] = [
  { size: "S", bust: [78, 84], waist: [60, 66], hip: [84, 90], height: [155, 162] },
  { size: "M", bust: [85, 90], waist: [67, 72], hip: [91, 96], height: [157, 164] },
  { size: "L", bust: [91, 97], waist: [73, 79], hip: [97, 103], height: [159, 166] },
  { size: "XL", bust: [98, 104], waist: [80, 86], hip: [104, 110], height: [161, 168] },
];
```

- [ ] **Step 2: Append the length note in `recommendSize()`**

Replace:
```ts
  const notes: string[] = [];
  const note = (label: string, v: number, r: [number, number]) => {
    if (v < r[0]) notes.push(`${label} nhỏ hơn chuẩn size — sẽ rộng nhẹ`);
    else if (v > r[1]) notes.push(`${label} lớn hơn chuẩn size — sẽ ôm hơn`);
  };
  note("Ngực", m.bust, best.row.bust);
  note("Eo", m.waist, best.row.waist);
  note("Hông", m.hip, best.row.hip);

  return { size: best.size, confidence, notes };
```
with:
```ts
  const notes: string[] = [];
  const note = (label: string, v: number, r: [number, number]) => {
    if (v < r[0]) notes.push(`${label} nhỏ hơn chuẩn size — sẽ rộng nhẹ`);
    else if (v > r[1]) notes.push(`${label} lớn hơn chuẩn size — sẽ ôm hơn`);
  };
  note("Ngực", m.bust, best.row.bust);
  note("Eo", m.waist, best.row.waist);
  note("Hông", m.hip, best.row.hip);

  if (m.height > best.row.height[1]) {
    notes.push("Với chiều cao của bạn, đầm có thể ngắn hơn dự kiến");
  } else if (m.height < best.row.height[0]) {
    notes.push("Với chiều cao của bạn, đầm có thể dài hơn dự kiến");
  }

  return { size: best.size, confidence, notes };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: `TypeScript: No errors found` (no other file constructs a `SizeRow` object literal, so the new required `height` field only needs filling in the 4 rows just edited).

- [ ] **Step 4: Manually verify all 3 cases in the browser**

Open the storefront preview at a product page with sizes S/M/L/XL (e.g. `http://localhost:5180/san-pham/lua-dem`), and seed a body profile directly via the browser console/JS tool for each case (avoids re-filling the modal form 3 times):

Case A — height above range (expect "ngắn hơn dự kiến"):
```js
localStorage.setItem("sen-body-profile", JSON.stringify({
  state: { measurements: { bust: 81, waist: 63, hip: 87, height: 170, weight: 55 }, name: "", modalOpen: false },
  version: 0,
}));
```
Reload the product page. Expected: the recommendation hint box shows size **S** (matches bust/waist/hip midpoint) and its note text includes "Với chiều cao của bạn, đầm có thể ngắn hơn dự kiến" (height 170 > S's range max of 162).

Case B — height below range (expect "dài hơn dự kiến"): same measurements but `height: 150`. Reload. Expected note: "...có thể dài hơn dự kiến" (150 < S's range min of 155).

Case C — height within range (expect no length note): `height: 158`. Reload. Expected: recommendation still shows, but the joined notes string does **not** contain "ngắn hơn dự kiến" or "dài hơn dự kiến" (only bust/waist/hip notes, if any, appear).

After verifying, clear the test data so it doesn't leave a stale profile in local dev state:
```js
localStorage.removeItem("sen-body-profile");
```

- [ ] **Step 5: Commit**

```bash
git add src/data/sizing.ts
git commit -m "$(cat <<'EOF'
Add height-based length note to size recommendation

SIZE_CHART rows gain a reference height range; recommendSize() flags
when a customer's height falls outside that size's range with a
directional note ("runs shorter/longer for you"), independent of the
existing bust/waist/hip size pick. No new UI — reuses the existing
notes rendering in Product.tsx.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** the reference height ranges, directional note copy, and "no new UI" decisions from the spec are all implemented in this single task.
- **Placeholders:** none — the exact ranges, copy strings, and verification measurements are all concrete.
- **Type consistency:** `height: [number, number]` matches the existing `bust`/`waist`/`hip` tuple shape on `SizeRow`; `m.height` already exists on `Measurements` (unused until now) so no interface change is needed there.
- **Out of scope reminder** (per spec): size selection itself is unchanged (still bust/waist/hip only); no slider UI; no admin configurability of the ranges.
