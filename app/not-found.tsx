import Link from "next/link";
import { SimpleLayout } from "@/components/layout/SimpleLayout";

export default function NotFound() {
  return (
    <SimpleLayout>
      <section className="glass-panel rounded-2xl p-8 text-center sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">404 Error</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Page not found</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          The page you requested does not exist. You can continue by browsing all games or using search.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300">
            Back to Home
          </Link>
          <Link
            href="/search"
            className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:border-sky-300/70 hover:bg-sky-500/10"
          >
            Search Games
          </Link>
        </div>
      </section>
    </SimpleLayout>
  );
}
