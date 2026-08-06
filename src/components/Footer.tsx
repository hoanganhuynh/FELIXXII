import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();
  const company = "CÔNG TY TNHH ANTNEST";
  const taxCode = "0319164820";

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
      <div className="flex flex-col gap-5 px-6 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap gap-x-7 gap-y-2">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="text-[13px] text-ink-soft transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-[var(--color-line)]" />
          <p className="mt-4 font-serif text-[13px] font-semibold tracking-[0.02em] text-ink">
            © {year} FELIXXII ATELIER • POWERED BY WILLIENS CREATIVE SPACE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 lg:justify-end">
          <div className="text-left text-[13px] leading-6 text-ink-soft lg:text-right">
            <p>MST: {taxCode}</p>
            <p>{company}</p>
          </div>
          <span className="hidden h-10 w-px bg-[var(--color-line)] md:block" />
          <a href="http://online.gov.vn/" target="_blank" rel="noopener noreferrer">
            <img
              src="/thongbao-bocongthuong.png"
              alt="Registered with Vietnam Ministry of Industry and Trade"
              className="h-12 w-auto opacity-90 transition-opacity hover:opacity-100 md:h-14"
            />
          </a>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
