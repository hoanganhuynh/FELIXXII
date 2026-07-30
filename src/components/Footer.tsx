import { useState } from "react";
import { Link } from "react-router-dom";

const POLICIES = [
  {
    title: "Chính sách mua hàng",
    body: (
      <>
        <p>Đơn hàng được xác nhận qua email sau khi thanh toán thành công. Felixxii Atelier chấp nhận thanh toán qua thẻ tín dụng, chuyển khoản ngân hàng và các ví điện tử phổ biến.</p>
        <p className="mt-3">Mọi đơn hàng được xử lý trong vòng 1–3 ngày làm việc. Felixxii có quyền huỷ đơn nếu sản phẩm hết hàng và sẽ hoàn tiền toàn bộ trong trường hợp này.</p>
      </>
    ),
  },
  {
    title: "Vận chuyển & Giao hàng",
    body: (
      <>
        <p>Miễn phí vận chuyển cho tất cả đơn hàng. Thời gian giao hàng dự kiến 3–5 ngày làm việc trong nội thành và 5–7 ngày cho các tỉnh thành khác.</p>
        <p className="mt-3">Đơn hàng sẽ được đóng gói cẩn thận và có mã theo dõi gửi về email. Felixxii không chịu trách nhiệm với các chậm trễ do đơn vị vận chuyển hoặc sự kiện ngoài tầm kiểm soát.</p>
      </>
    ),
  },
  {
    title: "Đổi trả & Hoàn tiền",
    body: (
      <>
        <p>Chấp nhận đổi trả trong vòng <strong>7 ngày</strong> kể từ ngày nhận hàng. Sản phẩm phải còn nguyên tem, chưa qua sử dụng và còn đủ bao bì gốc.</p>
        <p className="mt-3">Để yêu cầu đổi/trả, vui lòng liên hệ <a href="mailto:creative@williens.com" className="underline underline-offset-2">creative@williens.com</a> kèm ảnh sản phẩm và mã đơn hàng. Hoàn tiền sẽ được xử lý trong 5–7 ngày làm việc sau khi nhận lại hàng.</p>
        <p className="mt-3 text-ink-soft/70">Sản phẩm sale, may đo riêng hoặc đã qua sử dụng không được áp dụng chính sách đổi trả.</p>
      </>
    ),
  },
  {
    title: "Bảo hành sản phẩm",
    body: (
      <>
        <p>Felixxii Atelier bảo hành lỗi sản xuất trong vòng <strong>30 ngày</strong> kể từ ngày nhận hàng. Bảo hành bao gồm: đường may bị hở, khuy/khoá bị lỗi do sản xuất.</p>
        <p className="mt-3">Bảo hành không áp dụng với hư hỏng do sử dụng sai cách, giặt ủi không đúng hướng dẫn hoặc tai nạn. Vui lòng đọc kỹ nhãn hướng dẫn đi kèm sản phẩm.</p>
      </>
    ),
  },
];

function PolicyAccordion({ title, body }: { title: string; body: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--color-line)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="ml-4 shrink-0 text-lg text-ink-soft">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pb-5 text-[13px] leading-relaxed text-ink-soft">
          {body}
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { label: "Liên hệ", href: "/about" },
    { label: "Dịch vụ khách hàng", href: "/about" },
    { label: "Thông báo pháp lý", href: "/about" },
    { label: "Đăng ký nhận tin", href: "#subscribe" },
  ];

  return (
    <footer className="border-t border-[var(--color-line)]">
      {/* Email signup */}
      <div id="subscribe" className="flex flex-col items-center px-6 py-12 text-center">
        <p className="font-serif text-2xl md:text-3xl">Tham gia atelier của chúng tôi</p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 flex w-full max-w-lg items-center border-b border-[var(--color-line)] pb-2"
        >
          <input
            type="email"
            required
            placeholder="Email của bạn"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 text-[11px] tracking-[0.15em] uppercase text-ink-soft hover:text-ink transition-colors"
          >
            Đăng ký →
          </button>
        </form>
      </div>

      {/* Policy accordions */}
      <div className="border-t border-[var(--color-line)] px-6 py-8 md:px-8">
        <p className="mb-4 text-[11px] tracking-[0.15em] uppercase text-ink-soft">Chính sách</p>
        <div className="mx-auto max-w-2xl">
          {POLICIES.map((p) => (
            <PolicyAccordion key={p.title} title={p.title} body={p.body} />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 md:px-8">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-[12px] text-ink-soft hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <a href="http://online.gov.vn/" target="_blank" rel="noopener noreferrer">
            <img
              src="/thongbao-bocongthuong"
              alt="Đã thông báo Bộ Công Thương"
              className="h-8 w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
          <p className="text-[12px] text-ink-soft">© {year} FELIXXII ATELIER</p>
        </div>
      </div>
    </footer>
  );
}
