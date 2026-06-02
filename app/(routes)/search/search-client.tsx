"use client";

import { useMemo } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Game } from "@/lib/games";
import { GameGrid } from "@/components/ui/GameGrid";

interface SearchClientProps {
  games: Game[];
  categories: Array<{ name: string; count: number }>;
}

export function SearchClient({ games, categories }: SearchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const category = (searchParams.get("category") ?? "").trim().toLowerCase();

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesQuery =
        !query ||
        game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.tags.toLowerCase().includes(query);

      const matchesCategory = !category || game.categories.includes(category);

      return matchesQuery && matchesCategory;
    });
  }, [games, query, category]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const nextQuery = String(formData.get("q") ?? "").trim();
    const nextCategory = String(formData.get("category") ?? "").trim();

    if (nextQuery) {
      params.set("q", nextQuery);
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <>
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h1 className="section-title">Search Games</h1>
        <p className="section-subtitle">Find games by title, tag or category.</p>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="q">
            Search games
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Search by game title or tag"
            className="h-11 rounded-xl border border-white/15 bg-slate-900/70 px-4 text-sm text-white placeholder:text-slate-400 focus:border-sky-300/70 focus:outline-none"
          />

          <label className="sr-only" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="h-11 rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm text-white focus:border-sky-300/70 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="h-11 rounded-xl bg-sky-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Search
          </button>
        </form>
      </section>

      <div className="mt-8">
        {filteredGames.length > 0 ? (
          <GameGrid
            games={filteredGames}
            title={`Results (${filteredGames.length})`}
            subtitle={query || category ? "Filtered games" : "All available games"}
            columns={5}
          />
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-white">No games found</h2>
            <p className="mt-2 text-slate-300">Try a different keyword or remove the category filter.</p>
          </div>
        )}
      </div>
    </>
  );
}
