import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/85 py-8">
      <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">PlayArcadeX</p>
          <p className="text-sm text-slate-400">Free online browser games powered by GameMonetize.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/games" className="transition hover:text-white">
            Games
          </Link>
          <Link href="/search" className="transition hover:text-white">
            Search
          </Link>
          <Link href="/about" className="transition hover:text-white">
            About
          </Link>
        </nav>
      </div>
      <div className="page-shell mt-4 border-t border-white/10 pt-4 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} PlayArcadeX. All rights reserved.</p>
      </div>
    </footer>
  );
}
