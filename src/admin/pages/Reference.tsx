import { useState } from "react";
import { Card, Badge } from "../components/ui";
import { searchSkus } from "../api/products";
import { useAsync, useDebounced } from "../lib/useAsync";
import { supabase } from "../../lib/supabase";
import { CATEGORY_CODE, COLOR_CODE, SIZE_CODE } from "../data/sku";
import { categoryLabel, type CategoryId } from "../../data/catalog";
import { useTranslation } from "react-i18next";

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
  const [demo, setDemo] = useState("FX-BR-0001");
  const dDemo = useDebounced(demo, 250);
  const hits = useAsync(() => searchSkus(dDemo, 8), [dDemo], []);
  const total = useAsync(
    async () => (await supabase.from("variants").select("*", { count: "exact", head: true })).count ?? 0,
    [],
    0
  );
  const skuTotal = total.data;
  const { t } = useTranslation();

  return (
    <div className="max-w-[1000px]">
      <div className="mb-5">
        <h1 className="font-serif text-3xl">{t('ref.title')}</h1>
        <p className="mt-1 text-xs text-ink-soft">{t('ref.desc', { count: skuTotal.toLocaleString() })}</p>
      </div>

      {/* ---- SKU anatomy ---- */}
      <Card title={t('ref.sku_anatomy')} className="mb-4">
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
              <p className="text-[12px] tracking-[0.1em] text-ink-soft">{t('ref.style_code')}</p>
              <p className="mt-1 font-mono text-base">FX-EV-0142</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">{t('ref.style_desc')}</p>
            </div>
            <div className="rounded-md bg-[var(--color-tile)] p-4">
              <p className="text-[12px] tracking-[0.1em] text-ink-soft">{t('ref.full_sku')}</p>
              <p className="mt-1 font-mono text-base">FX-EV-0142-NV-M</p>
              <p className="mt-1.5 text-[12px] text-ink-soft">{t('ref.full_sku_desc')}</p>
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-ink-soft">
            <b className="text-ink">{t('ref.why_fixed_title')}</b> {t('ref.why_fixed_desc')}
          </p>
        </div>
      </Card>

      {/* ---- code tables ---- */}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card title={t('ref.cat_codes')}>
          <ul className="p-4 text-xs">
            {Object.entries(CATEGORY_CODE).map(([id, code]) => (
              <li key={id} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{categoryLabel(id as CategoryId)}</span></li>
            ))}
          </ul>
        </Card>
        <Card title={t('ref.col_codes')}>
          <ul className="p-4 text-xs">
            {Object.entries(COLOR_CODE).map(([name, code]) => (
              <li key={name} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{name}</span></li>
            ))}
          </ul>
        </Card>
        <Card title={t('ref.size_codes')}>
          <ul className="p-4 text-xs">
            {Object.entries(SIZE_CODE).map(([name, code]) => (
              <li key={name} className="flex justify-between py-1"><span className="font-mono">{code}</span><span className="text-ink-soft">{name}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---- naming convention ---- */}
      <Card title={t('ref.naming_conv')} className="mb-4">
        <div className="p-5">
          <p className="font-mono text-sm">{"{Poetic name} {Line?} {Variant?}"}</p>
          <p className="mt-1 font-mono text-sm text-ink-soft">Nguyệt · Nguyệt Couture · Nguyệt Couture B42</p>
          <ul className="mt-4 space-y-2 text-xs text-ink-soft">
            <li><b className="text-ink">{t('ref.poetic_name')}</b> {t('ref.poetic_desc')}</li>
            <li><b className="text-ink">{t('ref.line')}</b> {t('ref.line_desc')}</li>
            <li><b className="text-ink">{t('ref.variant')}</b> {t('ref.variant_desc')}</li>
            <li><b className="text-ink">{t('ref.never_in_name')}</b> {t('ref.never_desc')}</li>
          </ul>
        </div>
      </Card>

      {/* ---- ES strategy ---- */}
      <Card title={t('ref.es_mapping')} className="mb-4">
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Note k={t('ref.note1_k')} v={t('ref.note1_v')} />
            <Note k={t('ref.note2_k')} v={t('ref.note2_v')} />
            <Note k={t('ref.note3_k')} v={t('ref.note3_v')} />
            <Note k={t('ref.note4_k')} v={t('ref.note4_v')} />
            <Note k={t('ref.note5_k')} v={t('ref.note5_v')} />
            <Note k={t('ref.note6_k')} v={t('ref.note6_v')} />
          </div>
          <pre className="mt-5 max-h-80 overflow-auto rounded-md bg-ink p-4 font-mono text-[12px] leading-relaxed text-white/85">{ES_MAPPING}</pre>
        </div>
      </Card>

      <Card title={t('ref.es_query')} className="mb-4">
        <div className="p-5">
          <p className="text-xs leading-relaxed text-ink-soft">
            {t('ref.query_desc')}
          </p>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-ink p-4 font-mono text-[12px] leading-relaxed text-white/85">{ES_QUERY}</pre>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Note k={t('ref.typo')} v={t('ref.typo_desc')} />
            <Note k={t('ref.scale')} v={t('ref.scale_desc')} />
            <Note k={t('ref.indexing')} v={t('ref.indexing_desc')} />
            <Note k={t('ref.facets')} v={t('ref.facets_desc')} />
          </div>
        </div>
      </Card>

      {/* ---- live demo ---- */}
      <Card title={t('ref.live_search')}>
        <div className="p-5">
          <p className="mb-3 text-xs leading-relaxed text-ink-soft">
            {t('ref.live_desc', { count: skuTotal.toLocaleString() })}
          </p>
          <input value={demo} onChange={(e) => setDemo(e.target.value)} className="input" placeholder={t('ref.placeholder')} />
          <ul className="mt-3 divide-y divide-[var(--color-line)] border-y edge">
            {hits.data.map((h) => (
              <li key={h.sku} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-[12px]">{h.sku}</p>
                  <p className="truncate text-[12px] text-ink-soft">{h.style_name} · {h.color_name} / {h.size}</p>
                </div>
                <Badge>{`${t('ref.score')} ${h.score.toFixed(0)}`}</Badge>
              </li>
            ))}
            {!hits.loading && !hits.data.length && <li className="py-4 text-center text-xs text-ink-soft">{t('ref.no_hits')}</li>}
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
      <span className="mt-1 font-sans text-[12px] tracking-[0.08em] text-ink-soft">{k.toUpperCase()}</span>
    </span>
  );
}
function Note({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-[var(--color-tile)] p-3">
      <p className="font-mono text-[12px]">{k}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{v}</p>
    </div>
  );
}
