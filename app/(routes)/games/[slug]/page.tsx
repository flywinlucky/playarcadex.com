import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { FullscreenButton } from "@/components/ui/FullscreenButton";
import { GameFrame } from "@/components/ui/GameFrame";
import { SimilarGames } from "@/components/ui/SimilarGames";
import { getAllGames, getGameBySlug, getSimilarGames } from "@/lib/games";
import { absoluteUrl, siteConfig } from "@/lib/site";

interface GamePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return getAllGames().map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    return {
      title: "Game Not Found",
      description: "This game page does not exist.",
    };
  }

  const pageUrl = absoluteUrl(`/games/${game.slug}`);

  return {
    title: `${game.title} - Play Online for Free`,
    description: game.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${game.title} | ${siteConfig.name}`,
      description: game.description,
      url: pageUrl,
      type: "website",
      images: [{ url: game.image, width: 1200, height: 630, alt: game.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} | ${siteConfig.name}`,
      description: game.description,
      images: [game.image],
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const similarGames = getSimilarGames(game, 4);
  const pageUrl = absoluteUrl(`/games/${game.slug}`);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    genre: game.categories,
    url: pageUrl,
    image: game.image,
    publisher: {
      "@type": "Organization",
      name: "GameMonetize",
    },
    isAccessibleForFree: true,
    gamePlatform: "Web Browser",
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: game.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <MainLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-300/60"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Games
        </Link>

        <section className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-white sm:text-4xl">{game.title}</h1>
          <p className="mt-3 max-w-3xl text-slate-200">{game.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {game.categories.slice(0, 6).map((tag) => (
              <Link key={tag} href={`/search?category=${encodeURIComponent(tag)}`} className="game-tag">
                {tag}
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="relative">
              <GameFrame src={game.embed} title={game.title} />
              <FullscreenButton targetId="game-frame" />
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-white">How to play</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                <li>Click inside the game window to start.</li>
                <li>Use keyboard, mouse or touch controls based on in-game hints.</li>
                <li>Enable fullscreen for a smoother gameplay experience.</li>
              </ul>
            </div>
          </section>

          <SimilarGames games={similarGames} />
        </div>
      </div>
    </MainLayout>
  );
}
