import Link from "next/link";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeaturedGames } from "@/components/ui/FeaturedGames";
import { GameGrid } from "@/components/ui/GameGrid";
import { getAllGames, getAllTags, getFeaturedGames, getGamesCount, getGamesByCategory } from "@/lib/games";
import { absoluteUrl, siteConfig } from "@/lib/site";

export default function HomePage() {
  const allGames = getAllGames();
  const featuredGames = getFeaturedGames(5);
  const gamesCount = getGamesCount();

  const categorySections = getAllTags()
    .filter((tag) => tag.count >= 2)
    .slice(0, 4)
    .map((tag) => ({
      tag,
      games: getGamesByCategory(tag.name, 5),
    }))
    .filter((section) => section.games.length > 0);

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "PlayArcadeX Games",
    numberOfItems: allGames.length,
    itemListElement: allGames.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/games/${game.slug}`),
      name: game.title,
    })),
  };

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />

      <section className="hero-glow glass-panel animate-fade-up rounded-2xl p-6 sm:p-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">PlayArcadeX Platform</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Free Online Browser Games, instantly playable on any device.
          </h1>
          <p className="mt-4 text-base text-slate-200 sm:text-lg">
            Explore {gamesCount} hand-picked web games from GameMonetize. No installs, no account required, just
            click and play.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Find a Game
            </Link>
            <Link
              href="#all-games"
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-sky-300/70 hover:bg-sky-500/10"
            >
              Browse All
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-10">
        <FeaturedGames games={featuredGames} />

        {categorySections.map((section) => (
          <GameGrid
            key={section.tag.name}
            title={`${section.tag.name[0]?.toUpperCase() ?? ""}${section.tag.name.slice(1)} Games`}
            subtitle={`Popular picks in ${section.tag.name} category.`}
            games={section.games}
            columns={5}
          />
        ))}

        <div id="all-games" className="scroll-mt-24">
          <GameGrid
            title="All Games"
            subtitle="Starter catalog of 10 GameMonetize games, ready for expansion."
            games={allGames}
            columns={5}
          />
        </div>
      </div>
    </MainLayout>
  );
}
