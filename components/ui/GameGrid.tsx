import type { Game } from "@/lib/games";
import { GameCard } from "./GameCard";

interface GameGridProps {
  games: Game[];
  title?: string;
  subtitle?: string;
  columns?: 3 | 4 | 5;
}

function getGridClass(columns: 3 | 4 | 5): string {
  if (columns === 3) {
    return "grid grid-cols-2 gap-4 md:grid-cols-3";
  }

  if (columns === 4) {
    return "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4";
  }

  return "game-grid";
}

export function GameGrid({ games, title, subtitle, columns = 5 }: GameGridProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {title ? (
        <header>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </header>
      ) : null}

      <div className={getGridClass(columns)}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            slug={game.slug}
            title={game.title}
            image={game.image}
            tags={game.tags}
            description={game.description}
          />
        ))}
      </div>
    </section>
  );
}
