const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const normalizedSiteUrl = (runtimeEnv.NEXT_PUBLIC_SITE_URL || runtimeEnv.SITE_URL || "https://playarcadex.com").replace(/\/$/, "");

export const siteConfig = {
  name: "PlayArcadeX",
  title: "PlayArcadeX | Free Online Browser Games",
  description:
    "Play free online browser games instantly on PlayArcadeX. Discover action, racing, puzzle, simulation and arcade games from GameMonetize.",
  url: normalizedSiteUrl,
  keywords: [
    "free online games",
    "browser games",
    "html5 games",
    "play games online",
    "gamemonetize games",
    "arcade games",
    "puzzle games",
    "racing games",
    "action games",
    "simulation games",
  ],
} as const;

export function absoluteUrl(pathname: string = ""): string {
  if (!pathname || pathname === "/") {
    return siteConfig.url;
  }

  return `${siteConfig.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
