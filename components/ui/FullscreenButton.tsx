"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface FullscreenButtonProps {
  targetId: string;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export function FullscreenButton({ targetId }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    const element = document.getElementById(targetId) as FullscreenElement | null;
    if (!element) {
      return;
    }

    const doc = document as FullscreenDocument;

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
      return;
    }

    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    }
  }, [isFullscreen, targetId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as FullscreenDocument;
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("msfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("msfullscreenchange", onFullscreenChange);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        void toggleFullscreen();
      }}
      className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2 text-xs font-medium text-white transition hover:border-sky-300/60 hover:bg-slate-900"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
    </button>
  );
}
