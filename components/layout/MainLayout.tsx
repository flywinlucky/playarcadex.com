import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import type { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="page-shell flex w-full flex-1 gap-6 pt-20 pb-10">
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-[var(--sidebar-width)] shrink-0 overflow-y-auto lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
