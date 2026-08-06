import { useEffect, useState } from "react";
import { listSizeTemplates, saveSizeTemplate, deleteSizeTemplate, type SizeTemplateData } from "../api/sizeTemplates";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import { Card, Btn } from "../components/ui";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Freesize"];

export default function SizeTemplates() {
  const { isAdmin, ready } = useAuth();
  const templates = useAsync(() => listSizeTemplates(), [], []);
  
  const [activeId, setActiveId] = useState<string | "new">("new");
  const [draftName, setDraftName] = useState("");
  const [draftIsDefault, setDraftIsDefault] = useState(false);
  
  const [draftColumns, setDraftColumns] = useState<string[]>([]);
  const [draftRows, setDraftRows] = useState<SizeTemplateData["rows"]>([]);
  
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (templates.data.length > 0 && activeId === "new") {
      setActiveId(templates.data[0].id);
    }
  }, [templates.data]);

  useEffect(() => {
    if (activeId === "new") {
      setDraftName("Bảng Size Mới");
      setDraftIsDefault(false);
      setDraftColumns(["Vòng Ngực (cm)", "Vòng Eo (cm)", "Vòng Mông (cm)"]);
      setDraftRows([
        { size: "S", measurements: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }] },
        { size: "M", measurements: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }] },
        { size: "L", measurements: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }] }
      ]);
      setDirty(false);
    } else {
      const tmpl = templates.data.find(t => t.id === activeId);
      if (tmpl) {
        setDraftName(tmpl.name);
        setDraftIsDefault(tmpl.is_default);
        const data = tmpl.data as unknown as SizeTemplateData;
        setDraftColumns(data?.columns || []);
        setDraftRows(data?.rows || []);
        setDirty(false);
      }
    }
  }, [activeId, templates.data]);

  const editCell = (rowIndex: number, colIndex: number, bound: "min" | "max", val: number) => {
    setDraftRows((rows) => rows.map((r, ri) => {
      if (ri !== rowIndex) return r;
      const newM = [...r.measurements];
      if (!newM[colIndex]) newM[colIndex] = { min: 0, max: 0 };
      newM[colIndex] = { ...newM[colIndex], [bound]: val };
      return { ...r, measurements: newM };
    }));
    setDirty(true);
  };

  const addSizeRow = () => {
    const nextSize = SIZES.find(s => !draftRows.some(r => r.size === s)) || "New";
    setDraftRows([...draftRows, { size: nextSize, measurements: draftColumns.map(() => ({ min: 0, max: 0 })) }]);
    setDirty(true);
  };

  const removeSizeRow = (index: number) => {
    setDraftRows(draftRows.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addColumn = () => {
    setDraftColumns([...draftColumns, "Cột mới"]);
    setDraftRows(draftRows.map(r => ({ ...r, measurements: [...r.measurements, { min: 0, max: 0 }] })));
    setDirty(true);
  };

  const removeColumn = (colIndex: number) => {
    setDraftColumns(draftColumns.filter((_, i) => i !== colIndex));
    setDraftRows(draftRows.map(r => ({
      ...r,
      measurements: r.measurements.filter((_, i) => i !== colIndex)
    })));
    setDirty(true);
  };

  const renameColumn = (colIndex: number, newName: string) => {
    setDraftColumns(draftColumns.map((c, i) => i === colIndex ? newName : c));
    setDirty(true);
  };

  const save = async () => {
    if (!draftName.trim()) return setErr("Tên bảng size không được để trống.");
    setBusy(true); setErr(null);
    try {
      const data: SizeTemplateData = { columns: draftColumns, rows: draftRows };
      await saveSizeTemplate(activeId === "new" ? null : activeId, draftName, data, draftIsDefault);
      setDirty(false);
      await templates.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (activeId === "new") return;
    if (!confirm("Bạn có chắc chắn muốn xóa bảng size này? Các sản phẩm đang dùng sẽ bị mất liên kết.")) return;
    setBusy(true); setErr(null);
    try {
      await deleteSizeTemplate(activeId);
      setActiveId("new");
      await templates.reload();
    } catch (e) {
      setErr("Không thể xóa: Bảng size này có thể đang được sử dụng bởi một hoặc nhiều sản phẩm.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Bảng Size (Templates)</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Định nghĩa các mẫu bảng thông số kích cỡ cho từng loại sản phẩm. Bạn có thể gán bảng size này khi tạo/sửa sản phẩm.
        </p>
      </div>

      {ready && !isAdmin && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          Bạn cần quyền Admin để chỉnh sửa bảng size.
        </p>
      )}
      {err && <p className="mb-4 rounded-md bg-[var(--color-accent-soft)] px-4 py-2.5 text-xs text-[var(--color-accent)]">{err}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {templates.data.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${activeId === t.id ? "border-ink bg-ink text-white" : "edge hover:bg-[var(--color-tile)]"}`}>
            {t.name} {t.is_default && " (Mặc định)"}
          </button>
        ))}
        <button onClick={() => setActiveId("new")}
            className={`rounded-full border border-dashed px-4 py-1.5 text-xs transition-colors ${activeId === "new" ? "border-ink bg-[var(--color-tile)] text-ink font-medium" : "edge hover:bg-[var(--color-tile)]"}`}>
            + Tạo bảng size mới
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card
          title="Chi tiết Bảng Size"
          action={
            <div className="flex gap-2">
              {activeId !== "new" && !draftIsDefault && (
                 <button onClick={handleDelete} disabled={busy || !isAdmin} className="text-[12px] text-accent hover:underline">Xóa</button>
              )}
              {dirty ? <Btn onClick={save} disabled={busy || !isAdmin} className="!h-7">{busy ? "Đang lưu..." : "Lưu Thay Đổi"}</Btn> : <span className="text-[12px] text-ink-soft">Đã lưu</span>}
            </div>
          }
        >
          <div className="p-5">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-soft">Tên Bảng Size</label>
                <input 
                  type="text" 
                  value={draftName} 
                  onChange={(e) => { setDraftName(e.target.value); setDirty(true); }}
                  className="w-full rounded-md border edge bg-[var(--color-bg)] px-3 py-1.5 text-sm outline-none focus:border-ink"
                  disabled={!isAdmin}
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={draftIsDefault}
                    onChange={(e) => { setDraftIsDefault(e.target.checked); setDirty(true); }}
                    disabled={!isAdmin}
                  />
                  Đặt làm mặc định cho Sản phẩm mới
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b edge text-left text-[12px] tracking-[0.1em] text-ink-soft">
                    <th className="px-5 py-2.5 w-24">Size</th>
                    {draftColumns.map((col, colIndex) => (
                      <th key={colIndex} className="px-2 py-2.5">
                        <div className="flex items-center gap-1 group">
                          <input 
                            type="text" 
                            value={col} 
                            onChange={(e) => renameColumn(colIndex, e.target.value)}
                            disabled={!isAdmin}
                            className="bg-transparent border-b border-transparent focus:border-ink outline-none hover:bg-black/5 w-28 px-1 transition-colors"
                          />
                          <button onClick={() => removeColumn(colIndex)} disabled={!isAdmin} className="opacity-0 group-hover:opacity-100 text-accent p-1">&times;</button>
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2.5 w-10">
                      <button onClick={addColumn} disabled={!isAdmin} className="text-xl leading-none text-ink-soft hover:text-ink">+</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((row, i) => (
                    <tr key={i} className="border-b edge last:border-0">
                      <td className="px-2 py-2">
                         <input 
                          type="text" 
                          value={row.size} 
                          onChange={(e) => { 
                            const newRows = [...draftRows]; 
                            newRows[i].size = e.target.value; 
                            setDraftRows(newRows); 
                            setDirty(true); 
                          }}
                          className="w-full rounded-md border edge bg-[var(--color-bg)] px-2 py-1.5 text-sm font-serif text-center outline-none focus:border-ink"
                          disabled={!isAdmin}
                        />
                      </td>
                      {draftColumns.map((_, colIndex) => {
                        const m = row.measurements[colIndex] || { min: 0, max: 0 };
                        return (
                          <td key={colIndex} className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <NumIn value={m.min} disabled={!isAdmin} onChange={(v) => editCell(i, colIndex, "min", v)} />
                              <span className="text-ink-soft">–</span>
                              <NumIn value={m.max} disabled={!isAdmin} onChange={(v) => editCell(i, colIndex, "max", v)} />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center">
                         <button onClick={() => removeSizeRow(i)} disabled={!isAdmin} className="text-ink-soft hover:text-accent p-1">&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-4 flex justify-center">
                 <button onClick={addSizeRow} disabled={!isAdmin} className="text-xs font-medium text-ink hover:underline">+ Thêm Size</button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function NumIn({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 w-14 rounded border edge bg-white/60 px-1.5 text-center text-xs tabular-nums focus:border-ink focus:outline-none disabled:opacity-50" />
  );
}
