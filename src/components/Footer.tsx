import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { label: "Contact Us", href: "/about" },
    { label: "Customer Service", href: "/about" },
    { label: "Legal Notice", href: "/about" },
    { label: "Purchase Policy", href: "/about" },
    { label: "Shipping & Returns", href: "/about" },
    { label: "Warranty", href: "/about" },
    { label: "Subscribe", href: "#subscribe" },
  ];

  return (
    <footer className="border-t border-[var(--color-line)]">
      {/* Email signup */}
      <div id="subscribe" className="flex flex-col items-center px-6 py-12 text-center">
        <p className="font-serif text-2xl md:text-3xl">Join our atelier</p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 flex w-full max-w-lg items-center border-b border-[var(--color-line)] pb-2"
        >
          <input
            type="email"
            required
            placeholder="Your email"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 text-[11px] tracking-[0.15em] uppercase text-ink-soft hover:text-ink transition-colors"
          >
            Subscribe →
          </button>
        </form>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
          <p className="text-[12px] text-ink-soft">© {year} FELIXXII ATELIER</p>
        </div>
        <a href="http://online.gov.vn/" target="_blank" rel="noopener noreferrer">
          <img
            src="/thongbao-bocongthuong"
            alt="Registered with Vietnam Ministry of Industry and Trade"
            className="h-16 w-auto opacity-80 hover:opacity-100 transition-opacity"
          />
        </a>
      </div>
    </footer>
  );
}
