# Height-based fit notes — design

Date: 2026-07-20
Status: draft, pending user review

## Background

Inspired by a reference eyewear "Size and Fit" panel (lens measurements + a separate Narrow↔Wide / Low↔High fit slider), the user asked whether something similar applies to SEN Atelier's dress size recommendation.

The existing system (`src/data/sizing.ts`, `recommendSize()`) already picks a size from bust/waist/hip and attaches per-metric notes (e.g. "Ngực nhỏ hơn chuẩn size — sẽ rộng nhẹ"), rendered in `Product.tsx`'s size section. It has a `Measurements.height` field but never reads it — so a customer who is thin-but-tall or heavy-but-short gets a size purely from bust/waist/hip with no signal that the garment's fixed length may not suit their height. This spec adds that signal as an additional, independent note — not a new size axis, not a new UI (reuses the existing notes display).

## Decisions (from Q&A with user)

1. **Direction** (confirmed): garment length is fixed per size. A customer taller than that size's reference height range will find the hem sits higher than designed — i.e. **"runs shorter for you."** A customer shorter than the range gets **"runs longer for you."** Within range: no note.
2. **Reference height ranges** (proposed, approved): a new `height: [number, number]` tuple per `SIZE_CHART` row, cm, grading up slightly with size (larger sizes assume slightly taller reference wearers, matching real-world pattern grading):
   - S: [155, 162], M: [157, 164], L: [159, 166], XL: [161, 168]
3. **Copy**: "Với chiều cao của bạn, đầm có thể ngắn hơn dự kiến." (above range) / "...có thể dài hơn dự kiến." (below range) — appended to the same `notes` array the bust/waist/hip notes already populate, no new UI element.
4. **Scope**: only affects `recommendSize()`'s output and the existing notes rendering in `Product.tsx`. No change to which size is picked (still bust/waist/hip driven), no change to the "Enter measurements" gate, no new store/persistence.

## Implementation sketch

**`src/data/sizing.ts`**
- Add `height: [number, number]` to `SizeRow` and the 4 `SIZE_CHART` rows.
- In `recommendSize()`, after computing `best`, add one more `note(...)`-style check comparing `m.height` against `best.row.height`, pushing the appropriate copy from Decision 3 (not the generic `note()` helper's "smaller/larger — looser/tighter" phrasing, since height needs its own directional copy).

**`src/pages/Product.tsx`**
- No changes — `rec.notes` is already spread with `.join("; ")` into the existing hint box (line ~145).

## Out of scope

- No visual slider/chart UI (the reference image's slider style is not being adopted — text note fits the site's existing minimal pattern, per earlier discussion).
- No changes to `recommendSize`'s size selection itself (still bust/waist/hip only) — height only ever adds a note, never changes which size is picked.
- No admin-side configurability of the reference height ranges — they're static demo data like the rest of `SIZE_CHART`.
