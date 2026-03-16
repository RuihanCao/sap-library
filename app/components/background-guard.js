"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const FALLBACK_BG_IMAGE = 'url("/Sprite/Background/FieldBuild.png")';

export function BackgroundGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    const ensureBackgroundImage = () => {
      const current = getComputedStyle(root).getPropertyValue("--bg-image").trim().toLowerCase();
      if (!current || current === "none") {
        root.style.setProperty("--bg-image", FALLBACK_BG_IMAGE);
      }
    };

    ensureBackgroundImage();
    const frameId = window.requestAnimationFrame(ensureBackgroundImage);
    const timeoutId = window.setTimeout(ensureBackgroundImage, 180);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
