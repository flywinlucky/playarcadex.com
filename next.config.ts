import type { NextConfig } from "next";

const isGithubPages = process.env.DEPLOY_TARGET === "github-pages" || process.env.GITHUB_PAGES === "true";
const githubRepoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const configuredBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const normalizedConfiguredBasePath = configuredBasePath
  ? configuredBasePath === "/"
    ? ""
    : configuredBasePath.startsWith("/")
      ? configuredBasePath
      : `/${configuredBasePath}`
  : "";
const githubPagesBasePath = githubRepoName ? `/${githubRepoName}` : "";

// Avoid accidental CSS/asset 404s on Vercel root domains by applying basePath only for GitHub Pages builds.
const basePath = isGithubPages ? (normalizedConfiguredBasePath || githubPagesBasePath) : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  output: isGithubPages ? "export" : undefined,
  trailingSlash: isGithubPages,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.gamemonetize.com",
      },
      {
        protocol: "https",
        hostname: "www.onlinegames.io",
      },
      {
        protocol: "https",
        hostname: "cloud.onlinegames.io",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  ...(isGithubPages
    ? {}
    : {
        async redirects() {
          return [
            {
              source: "/game/:slug",
              destination: "/games/:slug",
              permanent: true,
            },
            {
              source: "/play/:slug",
              destination: "/games/:slug",
              permanent: true,
            },
          ];
        },
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
                {
                  key: "X-Content-Type-Options",
                  value: "nosniff",
                },
                {
                  key: "X-Frame-Options",
                  value: "SAMEORIGIN",
                },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=()",
                },
              ],
            },
            {
              source: "/images/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
