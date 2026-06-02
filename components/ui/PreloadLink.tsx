"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type PreloadLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
  prefetch?: boolean;
  preloadDelay?: number;
};

export default function PreloadLink({
  href,
  children,
  className,
  prefetch = true,
  preloadDelay = 100,
  ...props
}: PreloadLinkProps) {
  const router = useRouter();
  const [isPreloaded, setIsPreloaded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (!isPreloaded && prefetch) {
      timeoutRef.current = setTimeout(() => {
        router.prefetch(href);
        setIsPreloaded(true);
      }, preloadDelay);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      prefetch={false} // 我们手动控制预加载
      {...props}
    >
      {children}
    </Link>
  );
} 