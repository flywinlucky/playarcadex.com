import { Header } from "./Header";
import { Footer } from "./Footer";
import type { ReactNode } from "react";

interface SimpleLayoutProps {
  children: ReactNode;
}

export function SimpleLayout({ children }: SimpleLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="page-shell w-full flex-1 pt-20 pb-10">{children}</main>
      <Footer />
    </div>
  );
}
