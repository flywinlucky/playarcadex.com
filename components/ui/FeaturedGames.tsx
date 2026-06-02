import type { Game } from "@/lib/games";
import { GameGrid } from "./GameGrid";

interface FeaturedGamesProps {
  games: Game[];
}

export function FeaturedGames({ games }: FeaturedGamesProps) {
  if (games.length === 0) {
    return null;
  }

  return (
    <GameGrid
      games={games}
      title="Featured This Week"
      subtitle="Hand-picked browser games loaded instantly from GameMonetize."
      columns={5}
    />
  );
}
