import type { Metadata } from "next";
import { SimpleLayout } from "@/components/layout/SimpleLayout";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about PlayArcadeX, a fast browser-gaming platform powered by GameMonetize.",
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <SimpleLayout>
      <section className="glass-panel rounded-2xl p-6 sm:p-10">
        <h1 className="section-title">About PlayArcadeX</h1>
        <p className="section-subtitle">
          PlayArcadeX is a modern web gaming platform built for instant play on desktop and mobile.
        </p>

        <div className="mt-8 space-y-5 text-slate-200">
          <p>
            Our mission is simple: load high-quality browser games fast, keep the interface clean, and make discovery
            easy for every player.
          </p>
          <p>
            The current release starts with a curated set of GameMonetize titles so gameplay, SEO, and performance can
            be validated before scaling to a larger catalog.
          </p>
          <p>
            Every game runs directly in-browser. No download, no launcher, no friction.
          </p>
        </div>
      </section>
    </SimpleLayout>
  );
}
