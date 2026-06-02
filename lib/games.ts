import gameSeed from "@/game.json";

export interface Game {
  id: number;
  slug: string;
  title: string;
  embed: string;
  image: string;
  tags: string;
  description: string;
  provider?: string;
  categories: string[];
}

interface GameData {
  title: string;
  embed: string;
  image: string;
  tags: string;
  description: string;
  provider?: string;
}

let gamesCache: Game[] | null = null;

function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTags(tags: string): string {
  return tags
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
}

function toCategories(tags: string): string[] {
  return Array.from(
    new Set(
      tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function loadGames(): Game[] {
  if (gamesCache) {
    return gamesCache;
  }

  try {
    const gamesData = gameSeed as GameData[];

    gamesCache = gamesData.map((game, index) => {
      const safeTitle = sanitizeText(game.title);
      const safeDescription = sanitizeText(game.description);
      const normalizedTags = normalizeTags(game.tags);
      const categories = toCategories(normalizedTags);
      const id = index + 1;

      return {
        id,
        slug: `${id}-${slugify(safeTitle)}`,
        title: safeTitle,
        embed: game.embed,
        image: game.image,
        tags: normalizedTags,
        description: safeDescription,
        provider: game.provider ?? "gamemonetize",
        categories,
      };
    });

    return gamesCache;
  } catch (error) {
    console.error("Error loading games data:", error);
    return [];
  }
}

export function getAllGames(): Game[] {
  return loadGames();
}

export function getGamesCount(): number {
  return loadGames().length;
}

export function getGameById(id: number): Game | undefined {
  return loadGames().find((game) => game.id === id);
}

export function getGameBySlug(slug: string): Game | undefined {
  const games = loadGames();

  // Accept both SEO slugs and plain numeric IDs for backward compatibility.
  const idPrefix = Number.parseInt(slug.split("-")[0], 10);
  if (!Number.isNaN(idPrefix)) {
    const byId = games.find((game) => game.id === idPrefix);
    if (byId) {
      return byId;
    }
  }

  return games.find((game) => game.slug === slug);
}

export function getFeaturedGames(count: number = 6): Game[] {
  return loadGames().slice(0, count);
}

export function getSmartFeaturedGames(count: number = 6): Game[] {
  return getFeaturedGames(count);
}

export function getNewGames(count: number = 8): Game[] {
  return [...loadGames()].reverse().slice(0, count);
}

export function getPopularGames(count: number = 8): Game[] {
  return getFeaturedGames(count);
}

export function getWeeklyPopularGames(count: number = 8): Game[] {
  return getFeaturedGames(count);
}

export function getPersonalizedRecommendations(count: number = 8): Game[] {
  return getPopularGames(count);
}

export function getRecommendedForYou(count: number = 12): Game[] {
  return getPopularGames(count);
}

export function getGamesByCategory(category: string, count: number = 8): Game[] {
  const normalizedCategory = category.trim().toLowerCase();

  return loadGames()
    .filter((game) => game.categories.some((tag) => tag.includes(normalizedCategory)))
    .slice(0, count);
}

export function searchGames(query: string): Game[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return loadGames().filter((game) => {
    return (
      game.title.toLowerCase().includes(normalizedQuery) ||
      game.description.toLowerCase().includes(normalizedQuery) ||
      game.tags.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getAllTags(): { name: string; count: number }[] {
  const tagCounts = new Map<string, number>();

  loadGames().forEach((game) => {
    game.categories.forEach((category) => {
      tagCounts.set(category, (tagCounts.get(category) ?? 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getSimilarGames(game: Game, count: number = 4): Game[] {
  const gameTags = new Set(game.categories);

  return loadGames()
    .filter((candidate) => candidate.id !== game.id)
    .map((candidate) => {
      const overlap = candidate.categories.filter((tag) => gameTags.has(tag)).length;
      return { candidate, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap)
    .map((item) => item.candidate)
    .slice(0, count);
}
