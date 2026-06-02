"use client";

import Image from "next/image";
import type { ImageProps } from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

type OptimizedImageProps = Omit<ImageProps, "src" | "alt" | "placeholder"> & {
  src: string;
  alt: string;
  placeholder?: "blur" | "empty";
};

const DEFAULT_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNDAwJyBoZWlnaHQ9JzMwMCcgdmlld0JveD0nMCAwIDQwMCAzMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSdnJyB4MT0nMCUnIHkxPScwJScgeDI9JzEwMCUnIHkyPScxMDAlJz48c3RvcCBvZmZzZXQ9JzAlJyBzdG9wLWNvbG9yPScjMGVhNWU5JyBzdG9wLW9wYWNpdHk9Jy4yNScvPjxzdG9wIG9mZnNldD0nMTAwJScgc3RvcC1jb2xvcj0nI2Y5NzMxNicgc3RvcC1vcGFjaXR5PScuMjUnLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0nNDAwJyBoZWlnaHQ9JzMwMCcgZmlsbD0ndXJsKCNnKScvPjwvc3ZnPg==";

export default function OptimizedImage({
  src,
  alt,
  width = 400,
  height = 300,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  placeholder = "empty",
  blurDataURL,
  fill = false,
  unoptimized = false,
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  const imageClassName = `transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`;
  const resolvedBlurDataUrl = blurDataURL ?? DEFAULT_BLUR_DATA_URL;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={imageClassName}
        onError={() => setHasError(true)}
        onLoad={() => setLoaded(true)}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={placeholder === "blur" ? resolvedBlurDataUrl : undefined}
        unoptimized={unoptimized}
        {...props}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={imageClassName}
      onError={() => setHasError(true)}
      onLoad={() => setLoaded(true)}
      priority={priority}
      sizes={sizes}
      placeholder={placeholder}
      blurDataURL={placeholder === "blur" ? resolvedBlurDataUrl : undefined}
      unoptimized={unoptimized}
      {...props}
    />
  );
} 