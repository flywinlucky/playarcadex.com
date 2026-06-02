import type { Metadata } from "next";
import { MainLayout } from "@/components/layout/MainLayout";
import { GameGrid } from "@/components/ui/GameGrid";
import { getAllGames } from "@/lib/games";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Games",
  description: "Browse all free browser games available on PlayArcadeX.",
  alternates: {
    canonical: `${siteConfig.url}/games`,
  },
};

export default function AllGamesPage() {
  const games = getAllGames();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All Games - PlayArcadeX",
    url: absoluteUrl("/games"),
    description: "Complete list of free browser games on PlayArcadeX.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.title,
        url: absoluteUrl(`/games/${game.slug}`),
      })),
    },
  };

  return (
    <MainLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <GameGrid
        title="All Games"
        subtitle="Explore the complete starter catalog from GameMonetize."
        games={games}
        columns={5}
      />
    </MainLayout>
  );
}
