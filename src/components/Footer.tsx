import { Link } from "react-router-dom";

const cols: { title: string; links: [string, string][] }[] = [
  {
    title: "Shop",
    links: [
      ["Evening Dresses", "/shop?cat=dam-da-hoi"],
      ["Bridal", "/shop?cat=dam-bridal"],
      ["Tops", "/shop?cat=ao"],
      ["Sets", "/shop?cat=set"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Body Profile", "/about"],
      ["Size Guide", "/about"],
      ["Returns", "/about"],
      ["Contact", "/about"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-8 border-t edge">
      <div className="border-b edge px-5 py-14 text-center md:px-8">
        <p className="font-serif text-2xl">Join our atelier</p>
        <form onSubmit={(e) => e.preventDefault()} className="mx-auto mt-5 flex max-w-sm items-center border-b edge pb-2">
          <input type="email" required placeholder="Your email" className="w-full bg-transparent text-sm placeholder:text-ink-soft focus:outline-none" />
          <button className="label shrink-0">SUBSCRIBE →</button>
        </form>
      </div>

      <div className="mx-auto grid max-w-[1800px] gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <img src="/logo.svg" alt="FELIXXII" className="h-7 w-auto" />
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-soft">
            Evening & bridal couture. Demo/case-study — branding, imagery, and content are original.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="label text-ink-soft">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, to]) => (
                <li key={label}><Link to={to} className="text-sm link-underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-3 border-t edge px-5 py-6 text-[0.72rem] text-ink-soft md:flex-row md:px-8">
        <span>© {new Date().getFullYear()} FELIXXII</span>
        <span>Powered by <a href="https://williens.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">Williens Creative Space</a></span>
      </div>
    </footer>
  );
}
