"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface GameFrameProps {
  src: string;
  title: string;
}

export function GameFrame({ src, title }: GameFrameProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="glass-panel relative rounded-2xl p-2">
      {isLoading ? (
        <div className="absolute inset-2 z-20 flex items-center justify-center rounded-xl bg-slate-950/70">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading game...
          </div>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl bg-black" style={{ minHeight: "60vh" }}>
        <iframe
          id="game-frame"
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; gamepad; clipboard-write"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
