"use client";

// Slim top-of-page progress bar. When `active` it shows an indeterminate
// animated sweep; when it goes inactive it fills to 100% and fades out so the
// user gets a clear "done" signal rather than an abrupt disappearance.
import { useEffect, useState } from "react";

export function LoadingBar({ active }) {
  const [visible, setVisible] = useState(active);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (active) {
      setDone(false);
      setVisible(true);
      return;
    }
    if (!visible) return;
    // Snap to full, then fade out.
    setDone(true);
    const t = setTimeout(() => {
      setVisible(false);
      setDone(false);
    }, 400);
    return () => clearTimeout(t);
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div className="loading-bar" role="progressbar" aria-busy={active ? "true" : "false"}>
      <div className={`loading-bar-fill${done ? " done" : ""}`} />
    </div>
  );
}
