import { GameGrid } from "./GameGrid";
import type { Game } from "@/lib/games";

interface CategorySectionProps {
  title: string;
  games: Game[];
  slug: string;
}

export function CategorySection({ title, games, slug }: CategorySectionProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section id={`category-${slug}`} className="scroll-mt-20 py-8">
      <GameGrid
        title={title}
        games={games}
        columns={5}
      />
    </section>
  );
}