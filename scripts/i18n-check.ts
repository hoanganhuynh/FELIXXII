import i18n from "../src/admin/lib/i18n";
const flat = (o: any, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [p + k]));
const res = i18n.options.resources as any;
const en = flat(res.en.admin).sort();
const vi = flat(res.vi.admin).sort();
const missVi = en.filter((k) => !vi.includes(k));
const extraVi = vi.filter((k) => !en.includes(k));
// a VI value identical to EN is usually an untranslated leftover
const get = (o: any, path: string) => path.split(".").reduce((a, k) => a?.[k], o);
const same = en.filter((k) => get(res.en.admin, k) === get(res.vi.admin, k) && !/^[A-Z]{2,4}$/.test(String(get(res.en.admin, k))));
console.log(JSON.stringify({
  en_keys: en.length, vi_keys: vi.length,
  missing_in_vi: missVi,
  extra_in_vi: extraVi,
  identical_en_vi: same,
}, null, 1));
