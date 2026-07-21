import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../store/auth";

export default function Settings() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    
    setError("");
    setSuccess(false);
    
    if (password.length < 6) {
      setError(t("auth.pass_short", "Mật khẩu phải có ít nhất 6 ký tự."));
      return;
    }
    
    if (password !== confirm) {
      setError(t("auth.pass_mismatch", "Mật khẩu xác nhận không khớp."));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setPassword("");
      setConfirm("");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-ink-soft">{t("dash.not_admin", "Bạn không có quyền truy cập.")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-serif text-3xl">{t("settings", "Cài đặt")}</h1>
      
      <div className="rounded-xl border edge bg-[var(--color-bg)] p-6 shadow-sm">
        <h2 className="font-serif text-lg">{t("settings.change_password", "Đổi mật khẩu")}</h2>
        <p className="mt-1 text-xs text-ink-soft">
          {t("settings.change_password_desc", "Cập nhật mật khẩu mới cho tài khoản quản trị.")}
        </p>
        
        <form onSubmit={handleUpdate} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium tracking-wider text-ink-soft uppercase">
              {t("settings.new_password", "Mật khẩu mới")}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input w-full"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium tracking-wider text-ink-soft uppercase">
              {t("settings.confirm_password", "Xác nhận mật khẩu")}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input w-full"
              required
              minLength={6}
            />
          </div>
          
          {error && <p className="text-[12px] text-[var(--color-accent)]">{error}</p>}
          {success && <p className="text-[12px] text-emerald-600">{t("settings.success", "Đã cập nhật mật khẩu thành công.")}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-ink py-2.5 text-xs tracking-widest text-white uppercase hover:bg-ink-soft disabled:opacity-50"
          >
            {loading ? t("common.saving", "ĐANG LƯU...") : t("common.save", "LƯU THAY ĐỔI")}
          </button>
        </form>
      </div>
    </div>
  );
}
