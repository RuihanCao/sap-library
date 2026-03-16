"use client";

import { useEffect } from "react";

const MEDIA_SELECTOR = "img, picture, svg, canvas, video";

function markElement(element) {
  if (!(element instanceof Element)) return;
  element.setAttribute("data-darkreader-ignore", "");
  element.classList.add("darkreader-ignore");
}

function markElementAndDescendants(node) {
  if (!(node instanceof Element)) return;
  if (node.matches(MEDIA_SELECTOR)) {
    markElement(node);
  }
  node.querySelectorAll(MEDIA_SELECTOR).forEach((el) => markElement(el));
}

export function DarkModeImageGuard() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.querySelectorAll(MEDIA_SELECTOR).forEach((el) => markElement(el));

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => markElementAndDescendants(node));
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

