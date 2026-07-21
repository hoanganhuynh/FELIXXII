# Dashboard Return Reasons (Stage 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture *why* an order was returned (not just that it was), and surface the distribution of reasons on the Dashboard.

**Architecture:** A new `return_reason` enum + `return_reason`/`return_note` columns on `orders` (null unless `status = 'Returned'`, enforced by a check constraint). The only place these get written is `Orders.tsx`: changing an order's status to "Returned" now opens a small required reason picker before the status change commits; changing status *away* from "Returned" clears both fields. `dashboard_stats()` gains a `return_reasons: [{reason, count, pct}]` field; a new "Lý do trả hàng" panel on the Dashboard renders it with the existing `BarList` component (no new chart primitive needed).

**Tech Stack:** Postgres (Supabase migration), React/TypeScript.

**Reference spec:** `docs/superpowers/specs/2026-07-20-dashboard-analytics-improvements-design.md`, section "Stage 4". Builds on Stages 1-3 (already implemented).

**Decisions already approved by user:** add a real `return_reason` column and capture flow (not just a richer view of the existing count); reason set is `defect` / `wrong_size` / `changed_mind` / `wrong_shipment` / `other`. Historical Returned orders with no reason show as "unspecified" (no backfill — out of scope, per spec).

---

### Task 1: Schema — `return_reason` enum + columns

**Files:**
- Create: `supabase/migrations/20260720150000_return_reasons.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Capture *why* an order was returned, not just that it was.
-- return_reason/return_note are null unless status = 'Returned' —
-- enforced by a check constraint so a status change away from
-- 'Returned' can't leave a stale reason behind unnoticed.
-- ============================================================
create type public.return_reason as enum (
  'defect', 'wrong_size', 'changed_mind', 'wrong_shipment', 'other'
);

alter table public.orders
  add column return_reason public.return_reason,
  add column return_note text;

alter table public.orders
  add constraint return_reason_only_when_returned
  check (return_reason is null or status = 'Returned');
```

- [ ] **Step 2: Apply the migration**

Run: `npm run db:reset`
Expected: completes without error, migration `20260720150000_return_reasons.sql` listed.

- [ ] **Step 3: Verify the check constraint rejects a reason on a non-Returned order**

```bash
supabase db query "
update public.orders set return_reason = 'defect'
where id = (select id from public.orders where status != 'Returned' limit 1);
"
```
(Plain UPDATE doesn't support `LIMIT` directly — the subquery picks one row.) Expected: fails with a constraint violation (`new row for relation \"orders\" violates check constraint \"return_reason_only_when_returned\"`).

- [ ] **Step 4: Verify it accepts a reason on a Returned order**

`supabase db query`'s row scanner can't decode custom enum OIDs (`return_reason`, `status`) into its generic display type — cast both to `::text` in any `select`/`returning` that includes them, or the command errors with `unknown oid ... cannot be scanned`.

```bash
supabase db query "
update public.orders set return_reason = 'defect', return_note = 'test note'
where id = (select id from public.orders where status = 'Returned' limit 1);
"
supabase db query "
select id, status::text as status, return_reason::text as return_reason, return_note
from public.orders where return_note = 'test note';
"
```
Expected: one row, `return_reason = 'defect'`. Then immediately undo this test write so it doesn't leak into later verification:
```bash
supabase db query "
update public.orders set return_reason = null, return_note = null
where return_note = 'test note';
"
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260720150000_return_reasons.sql
git commit -m "$(cat <<'EOF'
Add return_reason/return_note columns to orders

A check constraint keeps both null unless status = 'Returned', so a
status change away from Returned can't leave a stale reason behind.
Capture flow (Orders.tsx) and the Dashboard breakdown land in
follow-up commits.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `dashboard_stats()` — return reason breakdown

**Files:**
- Create: `supabase/migrations/20260720150100_dashboard_return_reasons.sql`

- [ ] **Step 1: Write the migration**

This redefines `dashboard_stats()` again (live definition pattern from Stages 1-3), adding one field:

```sql
-- ============================================================
-- Add return_reasons to dashboard_stats(): distribution of
-- return_reason across all Returned orders. Orders returned before
-- this feature existed have return_reason = null — grouped and
-- labeled 'unspecified' on the frontend, not hidden.
-- ============================================================
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required'
      using errcode = '42501';
  end if;

  with paid as (
    select * from public.orders where status not in ('Cancelled', 'Returned')
  ),
  paid_items as (
    select oi.qty, oi.price, v.style_id, s.category_id, s.collection_id
    from public.order_items oi
    join paid p on p.id = oi.order_id
    join public.variants v on v.sku = oi.sku
    join public.styles s on s.id = v.style_id
  ),
  kpi as (
    select
      coalesce(sum(p.total), 0)::bigint as revenue,
      count(*)::int                     as orders,
      coalesce(avg(p.total), 0)::bigint as aov,
      (select coalesce(sum(oi.qty), 0)::int
         from public.order_items oi join paid p2 on p2.id = oi.order_id) as units
    from paid p
  ),
  rates as (
    select
      (select count(*) from public.orders)::int as all_orders,
      (select count(*) from public.orders where status = 'Returned')::int as returned,
      (select coalesce(sum(views), 0) from public.styles)::bigint      as views,
      (select coalesce(sum(units_sold), 0) from public.styles)::bigint as sold
  ),
  by_cat as (
    select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label, 'value', c.v) order by c.v desc) as rows
    from (
      select cat.id, cat.label, coalesce(sum(pi.qty * pi.price), 0)::bigint as v
      from public.categories cat
      left join paid_items pi on pi.category_id = cat.id
      group by cat.id, cat.label
    ) c
  ),
  by_col as (
    select jsonb_agg(jsonb_build_object('id', c.id, 'label', c.season, 'value', c.v) order by c.sort) as rows
    from (
      select col.id, col.season, col.sort, coalesce(sum(pi.qty * pi.price), 0)::bigint as v
      from public.collections col
      left join paid_items pi on pi.collection_id = col.id
      group by col.id, col.season, col.sort
    ) c
  ),
  top as (
    select jsonb_agg(t) as rows from (
      select s.id, s.name, s.style_code,
             coalesce(sum(pi.qty * pi.price), 0)::bigint as revenue,
             s.units_sold
      from public.styles s
      left join paid_items pi on pi.style_id = s.id
      group by s.id, s.name, s.style_code, s.units_sold
      order by revenue desc
      limit 6
    ) t
  ),
  oos as (
    select jsonb_agg(o) as rows from (
      select s.id, s.name, s.style_code,
             count(v.*)::int                                        as sku_count,
             s.units_sold,
             count(v.*) filter (where v.stock = 0)::int             as oos_count,
             count(v.*) filter (where v.stock between 1 and 3)::int as low_count
      from public.styles s join public.variants v on v.style_id = s.id
      where s.status = 'active'
      group by s.id, s.name, s.style_code, s.units_sold
      having count(v.*) filter (where v.stock = 0) > 0
          or count(v.*) filter (where v.stock between 1 and 3) > 0
      order by (count(v.*) filter (where v.stock = 0) * 2
              + count(v.*) filter (where v.stock between 1 and 3)) desc,
               s.units_sold desc
      limit 6
    ) o
  ),
  oos_total as (select count(*)::int as n from public.variants where stock = 0),
  customer_years as (
    select distinct customer_id, extract(year from placed_at)::int as yr
    from public.orders
  ),
  cumulative_orders as (
    select
      cy.customer_id, cy.yr,
      (select count(*) from public.orders o2
         where o2.customer_id = cy.customer_id
           and o2.placed_at < make_date(cy.yr + 1, 1, 1))::int as orders_thru_year
    from customer_years cy
  ),
  repeat_by_year as (
    select jsonb_agg(jsonb_build_object('year', yr, 'rate', rate) order by yr) as rows
    from (
      select yr, 100.0 * count(*) filter (where orders_thru_year >= 2) / count(*) as rate
      from cumulative_orders
      group by yr
    ) x
  ),
  return_reasons as (
    select jsonb_agg(jsonb_build_object('reason', reason, 'count', n, 'pct', pct) order by n desc) as rows
    from (
      select
        coalesce(return_reason::text, 'unspecified') as reason,
        count(*) as n,
        round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
      from public.orders
      where status = 'Returned'
      group by return_reason
    ) x
  )
  select jsonb_build_object(
    'revenue',       (select revenue from kpi),
    'orders',        (select orders  from kpi),
    'aov',           (select aov     from kpi),
    'units',         (select units   from kpi),
    'return_rate',   (select case when all_orders = 0 then 0 else returned::numeric * 100 / all_orders end from rates),
    'conversion',    (select case when views = 0 then 0 else sold::numeric * 100 / views end from rates),
    'by_category',   coalesce((select rows from by_cat), '[]'::jsonb),
    'by_collection', coalesce((select rows from by_col), '[]'::jsonb),
    'top',           coalesce((select rows from top), '[]'::jsonb),
    'stock_outs',    coalesce((select rows from oos), '[]'::jsonb),
    'oos_skus',      (select n from oos_total),
    'vip_count',     (select count(*)::int from public.customers where segment = 'VIP'),
    'vip_ltv',       (select coalesce(sum(ltv), 0)::bigint from public.customers where segment = 'VIP'),
    'total_ltv',     (select coalesce(sum(ltv), 0)::bigint from public.customers),
    'avg_ltv',       (select coalesce(round(avg(ltv)), 0)::bigint from public.customers),
    'repeat_rate_by_year', coalesce((select rows from repeat_by_year), '[]'::jsonb),
    'return_reasons', coalesce((select rows from return_reasons), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run: `npm run db:reset`
Expected: completes without error, migration `20260720150100_dashboard_return_reasons.sql` listed.

- [ ] **Step 3: Verify `return_reasons` sums to the Returned order count and percentages sum to ~100**

```bash
supabase db query "
select
  (select count(*) from public.orders where status = 'Returned') as returned_orders,
  (
    select sum((v->>'count')::int)
    from (select coalesce(return_reason::text, 'unspecified') as reason, count(*)
          from public.orders where status = 'Returned' group by return_reason) g,
    lateral (select jsonb_build_object('count', g.count)) v
  ) as sum_of_counts;
"
```
Expected: `returned_orders` = `sum_of_counts` (every Returned order is classified into exactly one reason bucket, including `unspecified`).

- [ ] **Step 4: Confirm the admin gate still holds**

```bash
supabase db query "select dashboard_stats();"
```
Expected: fails with `ERROR: forbidden: admin role required (SQLSTATE 42501)`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260720150100_dashboard_return_reasons.sql
git commit -m "$(cat <<'EOF'
Add return_reasons breakdown to dashboard_stats()

Groups all Returned orders by return_reason (nulls labeled
'unspecified' — pre-existing Returned orders had no reason captured).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Capture flow in `Orders.tsx`

**Files:**
- Modify: `src/lib/database.types.ts:211-248` (orders Row/Insert/Update + new enum)
- Modify: `src/admin/api/orders.ts` (`setOrderStatus` signature + `ReturnReason` type)
- Modify: `src/admin/pages/Orders.tsx` (reason picker UI in `OrderDrawer`)
- Modify: `src/admin/lib/i18n.ts` (new `ord.*` keys, EN + VI)

- [ ] **Step 1: Add the enum and columns to `database.types.ts`**

In `src/lib/database.types.ts`, add to the `Enums` object (after `order_status: ...` block, ~line 527):
```ts
      return_reason: "defect" | "wrong_size" | "changed_mind" | "wrong_shipment" | "other"
```

In the `orders` table's `Row`, `Insert`, and `Update` shapes (~lines 212-238), add two fields to each:
```ts
          return_reason: Database["public"]["Enums"]["return_reason"] | null
          return_note: string | null
```
(`Insert`/`Update` versions get a `?` — `return_reason?: ... | null`, `return_note?: string | null` — matching the optional-on-write pattern already used for `city`.)

- [ ] **Step 2: Update `src/admin/api/orders.ts`**

Add the type export (near the other type exports at the top):
```ts
export type ReturnReason = Database["public"]["Enums"]["return_reason"];
```

Replace `setOrderStatus`:
```ts
/** RLS denies by matching zero rows, so check what came back.
 *  Changing status to Returned requires a reason; changing away from
 *  Returned clears both fields (the DB check constraint would reject
 *  a stale reason on a non-Returned order anyway). */
export async function setOrderStatus(
  id: string, status: OrderStatus, returnReason?: ReturnReason, returnNote?: string
): Promise<void> {
  const patch =
    status === "Returned"
      ? { status, return_reason: returnReason ?? null, return_note: returnNote?.trim() || null }
      : { status, return_reason: null, return_note: null };
  const { data, error } = await supabase
    .from("orders").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Not permitted — admin role required.");
}
```

- [ ] **Step 3: Add i18n keys**

In `src/admin/lib/i18n.ts` EN `ord` block, after `total: "Total",`:
```ts
    return_reason_label: "Return reason",
    return_reason_placeholder: "Select a reason…",
    return_note_placeholder: "Note (optional)",
    reason: {
      defect: "Product defect",
      wrong_size: "Wrong size",
      changed_mind: "Changed mind",
      wrong_shipment: "Wrong/missing item shipped",
      other: "Other",
      unspecified: "Unspecified",
    },
```

In the VI `ord` block, after `total: "Tổng cộng",`:
```ts
    return_reason_label: "Lý do trả hàng",
    return_reason_placeholder: "Chọn lý do…",
    return_note_placeholder: "Ghi chú (không bắt buộc)",
    reason: {
      defect: "Lỗi sản phẩm",
      wrong_size: "Không vừa size",
      changed_mind: "Đổi ý",
      wrong_shipment: "Giao sai/thiếu",
      other: "Khác",
      unspecified: "Chưa xác định",
    },
```

Also add to the EN `dash` block (after `top_category: "Top category",`): `return_reasons: "Return reasons",`
And VI `dash` block (after `top_category: "Danh mục dẫn đầu",`): `return_reasons: "Lý do trả hàng",`

- [ ] **Step 4: Update `OrderDrawer` in `Orders.tsx`**

Add the import: `import { listOrders, getOrderItems, setOrderStatus, getOrderStats, type OrderListRow, type OrderStatus, type OrderChannel, type ReturnReason } from "../api/orders";`

Add a reason constant near the top of the file (after `const CHANNELS`):
```tsx
const RETURN_REASONS: ReturnReason[] = ["defect", "wrong_size", "changed_mind", "wrong_shipment", "other"];
```

Replace the `onStatus` callback passed from `AdminOrders` to `OrderDrawer`:
```tsx
          onStatus={async (s, reason, note) => {
            try {
              await setOrderStatus(open.id, s, reason, note);
              setOpen({
                ...open, status: s,
                return_reason: s === "Returned" ? (reason ?? null) : null,
                return_note: s === "Returned" ? (note?.trim() || null) : null,
              });
              list.reload();
              stats.reload();
            } catch (e) {
              alert(e instanceof Error ? e.message : String(e));
            }
          }}
```

Replace the `OrderDrawer` function signature and status section:
```tsx
function OrderDrawer({ order, onClose, onStatus }: {
  order: OrderListRow; onClose: () => void;
  onStatus: (s: OrderStatus, reason?: ReturnReason, note?: string) => void;
}) {
  const { t } = useTranslation();
  const items = useAsync(() => getOrderItems(order.id), [order.id], []);
  const [pendingReturn, setPendingReturn] = useState(false);
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [note, setNote] = useState("");

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/25" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-[70] h-full w-full max-w-md overflow-y-auto bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-start justify-between border-b edge px-6 py-5">
          <div>
            <p className="font-mono text-xs text-ink-soft">{order.id}</p>
            <h2 className="mt-1 font-serif text-xl">{order.customers?.name}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{fmtDate(order.placed_at)} · {t(`channel.${order.channel}`)} · {order.city}</p>
          </div>
          <button onClick={onClose} aria-label={t("common.close")} className="text-ink hover:opacity-60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="px-6 py-5">
          <Card title={t("ord.status")}>
            <div className="flex flex-wrap gap-1.5 p-4">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === "Returned" && order.status !== "Returned") setPendingReturn(true);
                    else onStatus(s);
                  }}
                  className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${order.status === s ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
            {pendingReturn && (
              <div className="space-y-2 border-t edge p-4">
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}>
                  <option value="">{t("ord.return_reason_placeholder")}</option>
                  {RETURN_REASONS.map((r) => <option key={r} value={r}>{t(`ord.reason.${r}`)}</option>)}
                </select>
                <textarea
                  className="input h-16 resize-none py-2"
                  placeholder={t("ord.return_note_placeholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Btn variant="ghost" onClick={() => { setPendingReturn(false); setReason(""); setNote(""); }}>{t("common.cancel")}</Btn>
                  <Btn
                    disabled={!reason}
                    onClick={() => {
                      onStatus("Returned", reason as ReturnReason, note);
                      setPendingReturn(false);
                      setReason("");
                      setNote("");
                    }}
                  >
                    {t("common.save")}
                  </Btn>
                </div>
              </div>
            )}
            {order.status === "Returned" && order.return_reason && (
              <p className="border-t edge px-4 py-3 text-xs text-ink-soft">
                {t("ord.return_reason_label")}: {t(`ord.reason.${order.return_reason}`)}
                {order.return_note && <span> — {order.return_note}</span>}
              </p>
            )}
          </Card>

          <h3 className="mt-6 text-[11px] tracking-[0.12em] text-ink-soft">{t("ord.items")}</h3>
          <ul className="mt-2 divide-y divide-[var(--color-line)] border-y edge">
            {items.data.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-serif text-sm">{i.name}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{i.sku}</p>
                  <p className="text-[11px] text-ink-soft">{i.size} / {i.color} × {i.qty}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums">{vnd(i.price * i.qty)}</span>
              </li>
            ))}
            {items.loading && <li className="py-4 text-center text-xs text-ink-soft">{t("common.loading")}</li>}
          </ul>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-ink-soft"><dt>{t("ord.subtotal")}</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
            <div className="flex justify-between text-ink-soft"><dt>{t("ord.shipping")}</dt><dd>{t("ord.free")}</dd></div>
            <div className="flex justify-between border-t edge pt-2 font-serif text-base"><dt>{t("ord.total")}</dt><dd className="tabular-nums">{vnd(order.total)}</dd></div>
          </dl>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify i18n parity**

Run: `npm run i18n:check`
Expected: `missing_in_vi`/`extra_in_vi` empty.

- [ ] **Step 7: Manually verify in the browser**

Reload `http://localhost:5180/admin/orders`, log in as admin (session from earlier stages may have expired — sign in again if the gate screen shows), open any non-Returned order, click "Returned":
- A reason select + note field appears; the "Save" button is disabled until a reason is picked.
- Pick a reason, type a note, click Save — the drawer updates to show the status as Returned and displays the captured reason/note below the status buttons.
- Reopen the same order — the reason/note persisted (confirms the DB write and the check constraint didn't reject it).
- Change the status away from Returned to something else, then back to Returned again — confirm the old note doesn't silently reappear (it was cleared server-side) and the drawer prompts for a fresh reason.

- [ ] **Step 8: Commit**

```bash
git add src/lib/database.types.ts src/admin/api/orders.ts src/admin/pages/Orders.tsx src/admin/lib/i18n.ts
git commit -m "$(cat <<'EOF'
Require a reason when marking an order Returned

OrderDrawer now shows a reason picker + optional note before
committing a Returned status change; setOrderStatus clears both
fields when status changes away from Returned.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Dashboard "Lý do trả hàng" panel

**Files:**
- Modify: `src/admin/api/dashboard.ts` (add `return_reasons` field)
- Modify: `src/admin/pages/Dashboard.tsx` (new panel)

- [ ] **Step 1: Add the field to `DashboardStats`**

In `src/admin/api/dashboard.ts`, add to the interface (after `repeat_rate_by_year: ...`):
```ts
  return_reasons: { reason: string; count: number; pct: number }[];
```
Add to `EMPTY_STATS` (after `repeat_rate_by_year: [],`):
```ts
  return_reasons: [],
```

- [ ] **Step 2: Add the panel**

In `src/admin/pages/Dashboard.tsx`, the "category + top + stock" row currently is a 3-column grid (`grid gap-4 lg:grid-cols-3`) containing "by_category", "top_styles", "stock_outs" cards. Add a fourth card for return reasons in the same row, changing the grid to 4 columns:

Replace:
```tsx
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
```
with:
```tsx
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
```

Then, after the `stock_outs` `Card` block closes (before the closing `</div>` of that grid), add:

```tsx
          <Card title={t("dash.return_reasons")}>
            <div className="px-5 py-4">
              {m.return_reasons.length ? (
                <BarList
                  items={m.return_reasons.map((r) => ({
                    label: t(`ord.reason.${r.reason}`),
                    value: Number(r.pct),
                  }))}
                  valueFmt={(n) => `${n.toFixed(0)}%`}
                />
              ) : (
                <p className="py-6 text-center text-xs text-ink-soft">{t("common.none")}</p>
              )}
            </div>
          </Card>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify in the browser**

Reload `http://localhost:5180/admin`. Confirm a fourth "Lý do trả hàng" card renders alongside category/top-styles/stock-outs, showing a bar per reason with a percentage. If no Returned orders have a reason yet (fresh seed data), it will show 100% "Unspecified" — go to Orders, mark one order Returned with a specific reason (per Task 3's manual test), reload the Dashboard, and confirm the new reason now appears in the breakdown.

- [ ] **Step 5: Commit**

```bash
git add src/admin/api/dashboard.ts src/admin/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Add return-reason breakdown panel to the Dashboard

Renders dashboard_stats().return_reasons with the existing BarList
component — no new chart primitive needed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** schema (#6's data-model gap), capture flow, and Dashboard panel are covered by Tasks 1, 3, and 4 respectively; Task 2 wires the aggregation these depend on.
- **Placeholders:** none — every step has literal SQL/TS content and concrete expected output.
- **Type consistency:** `return_reasons: { reason: string; count: number; pct: number }[]` (Task 4) matches the `jsonb_build_object('reason', ..., 'count', ..., 'pct', ...)` shape from Task 2. `ReturnReason` (Task 3) is the same union added to `database.types.ts`'s `Enums.return_reason` (Task 3, Step 1) — both edited together in the same task so they can't drift.
- **Out of scope reminder** (per spec): no backfill of `return_reason` for pre-existing Returned orders (shown as "unspecified" — correct, not a bug); no changes to `ProductEditor.tsx`'s existing per-style `returns` count field.
