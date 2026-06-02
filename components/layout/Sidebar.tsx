import Link from "next/link";
import { getAllTags } from "@/lib/games";

export function Sidebar() {
  const topTags = getAllTags().slice(0, 12);

  return (
    <div className="glass-panel rounded-2xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Browse</h2>
      <nav className="mt-3 space-y-1">
        <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
          Home
        </Link>
        <Link
          href="/games"
          className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          All Games
        </Link>
        <Link
          href="/search"
          className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          Search Games
        </Link>
        <Link href="/about" className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
          About PlayArcadeX
        </Link>
      </nav>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Top Categories</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {topTags.map((tag) => (
            <Link key={tag.name} href={`/search?category=${encodeURIComponent(tag.name)}`} className="game-tag">
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
