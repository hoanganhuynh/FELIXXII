import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-medium tracking-wide md:text-8xl">404</p>
      <p className="mt-4 text-sm text-ink-soft">This page could not be found.</p>
      <Link to="/" className="link-underline mt-8 text-sm">
        ← Back to home
      </Link>
    </div>
  );
}
