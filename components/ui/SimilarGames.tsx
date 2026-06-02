import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/lib/games";

interface SimilarGamesProps {
  games: Game[];
}

export function SimilarGames({ games }: SimilarGamesProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <aside className="glass-panel rounded-2xl p-4">
      <h3 className="text-lg font-semibold text-white">Similar Games</h3>
      <div className="mt-4 space-y-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-2 transition hover:border-sky-300/40"
          >
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md">
              <Image src={game.image} alt={game.title} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium text-white">{game.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-300">{game.tags.split(",")[0]}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
