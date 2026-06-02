import Link from "next/link";
import { Gamepad2, Search } from "lucide-react";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-orange-400 text-slate-900 shadow-lg shadow-sky-500/20">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PlayArcadeX</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/games"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            Games
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
