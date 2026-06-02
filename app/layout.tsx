import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";
import GoogleAnalytics from "@/components/layout/GoogleAnalytics";
import GoogleAdSense from "@/components/layout/GoogleAdSense";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/images/og-image.svg",
        width: 1200,
        height: 630,
        alt: siteConfig.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/images/twitter-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32" },
      { url: "/icon-simple.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const gaId = runtimeEnv.NEXT_PUBLIC_GA_ID;
  const adsenseId = runtimeEnv.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <link rel="preconnect" href="https://html5.gamemonetize.com" />
        <link rel="preconnect" href="https://img.gamemonetize.com" />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {adsenseId ? <GoogleAdSense adClientId={adsenseId} /> : null}
        {children}
      </body>
    </html>
  );
}
