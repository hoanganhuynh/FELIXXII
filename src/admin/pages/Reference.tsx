import { useMemo, useState } from "react";
import { Card, Badge } from "../components/ui";
import { useAdmin } from "../store/adminData";
import { searchSkus } from "../lib/search";
import { CATEGORY_CODE, COLOR_CODE, SIZE_CODE } from "../data/sku";
import { categoryLabel, type CategoryId } from "../../data/catalog";

const ES_MAPPING = `PUT /felixxii-skus
{
  "settings": {
    "analysis": {
      "normalizer": {
        "sku_norm": { "type": "custom", "filter": ["uppercase"] }
      },
      "analyzer": {
        "sku_parts": {
          "tokenizer": "sku_split",
          "filter": ["uppercase"]
        },
        "vi_text": {
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "tokenizer": {
        "sku_split": { "type": "pattern", "pattern": "-" }
      }
    }
  },
  "mappings": {
    "properties": {
      "sku": {
        "type": "keyword",
        "normalizer": "sku_norm",
        "fields": {
          "parts":  { "type": "text", "analyzer": "sku_parts" },
          "prefix": { "type": "search_as_you_type" }
        }
      },
      "style_code": { "type": "keyword", "normalizer": "sku_norm" },
      "name": {
        "type": "text",
        "analyzer": "vi_text",
        "fields": { "kw": { "type": "keyword" } }
      },
      "barcode":    { "type": "keyword" },
      "category":   { "type": "keyword" },
      "collection": { "type": "keyword" },
      "color":      { "type": "keyword" },
      "size":       { "type": "keyword" },
      "price":      { "type": "scaled_float", "scaling_factor": 1 },
      "stock":      { "type": "integer" },
      "status":     { "type": "keyword" },
      "updated_at": { "type": "date" }
    }
  }
}`;

const ES_QUERY = `GET /felixxii-skus/_search
{
  "query": {
    "bool": {
      "should": [
        { "term":  { "sku":       { "value": "FX-EV-0142-NV-M", "boost": 10 } } },
        { "term":  { "barcode":   { "value": "8930142010",      "boost": 10 } } },
        { "term":  { "style_code":{ "value": "FX-EV-0142",      "boost": 6  } } },
        { "match": { "sku.parts": { "query": "EV 0142 NV",      "boost": 4  } } },
        { "multi_match": {
            "query": "FX-EV-0142",
            "type": "bool_prefix",
            "fields": ["sku.prefix", "sku.prefix._2gram", "sku.prefix._3gram"],
            "boost": 3
        } },
        { "match": { "name": { "query": "nguyet", "fuzziness": "AUTO", "boost": 2 } } }
      ],
      "filter": [
        { "term": { "status": "active" } },
        { "range": { "stock": { "gt": 0 } } }
      ],
      "minimum_should_match": 1
    }
  },
  "aggs": {
    "by_category":   { "terms": { "field": "category" } },
    "by_color":      { "terms": { "field": "color" } },
    "price_ranges":  { "range": { "field": "price",
        "ranges": [{ "to": 2000000 }, { "from": 2000000, "to": 4000000 }, { "from": 4000000 }] } }
  },
  "size": 30
}`;

export default function Reference() {
  const styles = useAdmin((s) => s.styles);
  const [demo, setDemo] = useState("FX-EV");
  const hits = useMemo(() => searchSkus(styles, demo, 8), [styles, demo]);
  const skuTotal = styles.reduce((n, s) => n + s.variants.length, 0);

  return (
    <div className="max-w-[1000px]">
      <div className="mb-5">
        <h1 className="font-serif text-3xl">SKU & Search</h1>
        <p className="mt-1 text-xs text-ink-soft">The coding scheme behind {skuTotal.toLocaleString()} SKUs, and how search is indexed to find them.</p>
      </div>

      {/* ---- SKU anatomy ---- */}
      <Card title="SKU anatomy" className="mb-4">
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-1 font-mono text-2xl">
            <Seg v="FX" k="brand" />
            <span className="pb-6 text-ink-soft">-</span>
            <Seg v="EV" k="category" accent />
            <span className="pb-6 text-ink-soft">-</span>
            <Seg v="0142" k="style serial" accent />
            <span className="pb-6 text-ink-soft">-</span>
            <Seg v="NV" k="colour" accent />
            <span className="pb-6 text-ink-soft">-</span>
            <Seg v="M" k="size" accent />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md bg-[var(--color-tile)] p-4">
              <p className="text-[10px] tracking-[0.1em] text-ink-soft">STYLE CODE (design)</p>
              <p className="mt-1 font-mono text-base">FX-EV-0142</p>
              <p className="mt-1.5 text-[11px] text-ink-soft">One per design. Groups all its colour/size variants. This is what merchandisers talk in.</p>
            </div>
            <div className="rounded-md bg-[var(--color-tile)] p-4">
              <p className="text-[10px] tracking-[0.1em] text-ink-soft">FULL SKU (variant)</p>
              <p className="mt-1 font-mono text-base">FX-EV-0142-NV-M</p>
              <p className="mt-1.5 text-[11px] text-ink-soft">One per sellable unit. This is what stock, barcodes and orders key on.</p>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-ink-soft">
            <b className="text-ink">Why fixed-width, meaningful segments?</b> At ~7,000 SKUs a human has to read these in a warehouse, on a
            packing slip and in a spreadsheet. Fixed width makes them sortable as plain text; meaningful segments let staff decode a SKU
            without a lookup; and the <span className="font-mono">-</span> delimiter gives Elasticsearch a clean tokenisation boundary so
            each segment stays independently searchable.
          </p>
        </div>
      </Card>

      {/* ---- code tables ---- */}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card title="Category codes">
          <ul className="p-4 text-xs">
            {Object.entries(CATEGORY_CODE).map(([id, code]) => (
              <li key={id} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{categoryLabel(id as CategoryId)}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Colour codes">
          <ul className="p-4 text-xs">
            {Object.entries(COLOR_CODE).map(([name, code]) => (
              <li key={name} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{name}</span></li>
            ))}
          </ul>
        </Card>
        <Card title="Size codes">
          <ul className="p-4 text-xs">
            {Object.entries(SIZE_CODE).map(([name, code]) => (
              <li key={name} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{name}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---- naming convention ---- */}
      <Card title="Product naming convention" className="mb-4">
        <div className="p-5">
          <p className="font-mono text-sm">{"{Poetic name} {Line?} {Variant?}"}</p>
          <p className="mt-1 font-mono text-sm text-ink-soft">Nguyệt · Nguyệt Couture · Nguyệt Couture B42</p>
          <ul className="mt-4 space-y-2 text-xs text-ink-soft">
            <li><b className="text-ink">Poetic name</b> — the brand voice (Vietnamese, evocative). Reused across seasons; never encodes colour or size.</li>
            <li><b className="text-ink">Line</b> — optional tier: <i>Couture</i>, <i>Signature</i>, <i>Édition</i>, <i>Atelier</i>. Signals price band.</li>
            <li><b className="text-ink">Variant</b> — only when a name repeats within a category; keeps names unique without polluting them with codes.</li>
            <li><b className="text-ink">Never in the name:</b> colour, size, SKU, season. Those live in structured fields — putting them in the name breaks search relevance and makes bulk edits unsafe.</li>
          </ul>
        </div>
      </Card>

      {/* ---- ES strategy ---- */}
      <Card title="Elasticsearch — index mapping" className="mb-4">
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Note k="sku → keyword" v="Exact, case-normalised. The only way to guarantee a scan of FX-EV-0142-NV-M returns exactly one hit." />
            <Note k="sku.parts → pattern tokenizer" v="Splits on '-' so EV, 0142, NV, M are each searchable. Staff can type just 0142." />
            <Note k="sku.prefix → search_as_you_type" v="Powers the type-ahead: FX-EV-01 narrows live without a wildcard scan." />
            <Note k="name → asciifolding" v="Strips Vietnamese diacritics, so 'nguyet' matches 'Nguyệt'. Critical — staff type without tone marks." />
            <Note k="barcode → keyword" v="Scanner input is exact; no analysis wanted." />
            <Note k="category/color/size → keyword" v="Filters + aggregations for facets, not scoring." />
          </div>
          <pre className="mt-5 max-h-80 overflow-auto rounded-md bg-ink p-4 font-mono text-[11px] leading-relaxed text-white/85">{ES_MAPPING}</pre>
        </div>
      </Card>

      <Card title="Elasticsearch — the query" className="mb-4">
        <div className="p-5">
          <p className="text-xs leading-relaxed text-ink-soft">
            One <span className="font-mono">bool.should</span> with descending boosts: an exact SKU or barcode (×10) always outranks a style
            code (×6), which outranks a segment match (×4), a prefix (×3) and a fuzzy name (×2). <span className="font-mono">filter</span>
            clauses (status, stock) don't score — they just narrow, and they're cached. This is what stops "Nguyệt" from ever burying the
            person who scanned the actual barcode.
          </p>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-ink p-4 font-mono text-[11px] leading-relaxed text-white/85">{ES_QUERY}</pre>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Note k="Typo tolerance" v="fuzziness: AUTO on name only — never on sku. A one-character slip in a SKU is a different product, not a typo." />
            <Note k="Scale" v="7k SKUs is one primary shard, ~5MB. Don't over-shard: a single shard keeps scoring exact and queries sub-10ms." />
            <Note k="Indexing" v="Index the variant, denormalise the style fields onto it. Reindex a style's variants together on save." />
            <Note k="Facets" v="terms aggs on the keyword fields give the storefront filter rail its counts in the same round-trip." />
          </div>
        </div>
      </Card>

      {/* ---- live demo ---- */}
      <Card title="Live search demo (client-side approximation)">
        <div className="p-5">
          <p className="mb-3 text-xs text-ink-soft">
            This admin runs the same ranking rules in-memory (see <span className="font-mono">admin/lib/search.ts</span>) so the behaviour is
            demonstrable without a cluster. Try <button onClick={() => setDemo("FX-EV")} className="link-underline font-mono">FX-EV</button>,{" "}
            <button onClick={() => setDemo("nguyet")} className="link-underline font-mono">nguyet</button>, or{" "}
            <button onClick={() => setDemo("0142 NV")} className="link-underline font-mono">0142 NV</button>.
          </p>
          <input value={demo} onChange={(e) => setDemo(e.target.value)} className="input" placeholder="Type a SKU, segment, or name…" />
          <ul className="mt-3 divide-y divide-[var(--color-line)] border-y edge">
            {hits.map(({ style, variant, score }) => (
              <li key={variant.sku} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px]">{variant.sku}</p>
                  <p className="truncate text-[11px] text-ink-soft">{style.name} · {variant.colorName} / {variant.size}</p>
                </div>
                <Badge>{`score ${score.toFixed(0)}`}</Badge>
              </li>
            ))}
            {!hits.length && <li className="py-4 text-center text-xs text-ink-soft">No hits.</li>}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function Seg({ v, k, accent }: { v: string; k: string; accent?: boolean }) {
  return (
    <span className="flex flex-col items-center">
      <span className={accent ? "text-[var(--color-accent)]" : ""}>{v}</span>
      <span className="mt-1.5 h-px w-full bg-[var(--color-line)]" />
      <span className="mt-1 font-sans text-[9px] tracking-[0.08em] text-ink-soft">{k.toUpperCase()}</span>
    </span>
  );
}
function Note({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-[var(--color-tile)] p-3">
      <p className="font-mono text-[11px]">{k}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{v}</p>
    </div>
  );
}
