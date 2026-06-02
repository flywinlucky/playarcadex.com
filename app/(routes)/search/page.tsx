import type { Metadata } from "next";
import { Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { getAllGames, getAllTags } from "@/lib/games";
import { siteConfig } from "@/lib/site";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Search Games",
  description: "Search free browser games by keyword or category on PlayArcadeX.",
  alternates: {
    canonical: `${siteConfig.url}/search`,
  },
};

export default function SearchPage() {
  const games = getAllGames();
  const categories = getAllTags().slice(0, 20);

  return (
    <MainLayout>
      <Suspense fallback={<div className="glass-panel rounded-2xl p-8 text-slate-200">Loading search...</div>}>
        <SearchClient games={games} categories={categories} />
      </Suspense>
    </MainLayout>
  );
}
