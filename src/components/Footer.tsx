export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { label: "Contact Us", href: "/about" },
    { label: "Customer Service", href: "/about" },
    { label: "Store Locator", href: "/about" },
    { label: "Legal Notice", href: "/about" },
    { label: "Subscribe", href: "/about" },
    { label: "Social", href: "/about" },
  ];

  return (
    <footer className="border-t border-[var(--color-edge)]">
      {/* Email signup */}
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <p className="font-serif text-2xl md:text-3xl">Join our atelier</p>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 flex w-full max-w-lg items-center border-b border-[var(--color-edge)] pb-2"
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
      <div className="border-t border-[var(--color-edge)] flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 md:px-8">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[12px] text-ink-soft hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <p className="text-[12px] text-ink-soft">© {year} FELIXXII ATELIER</p>
      </div>
    </footer>
  );
}
