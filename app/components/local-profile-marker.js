"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPackSprite } from "@/lib/packSprites";
import { LOCAL_PROFILE_EVENT, readLocalProfile } from "@/lib/localProfile";

function formatWinrate(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "-";
  return `${(num * 100).toFixed(1)}%`;
}

function formatShare(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "-";
  return `${(num * 100).toFixed(1)}%`;
}

function formatRelativeTime(value) {
  if (!value) return "-";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "-";
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.floor(diffMs / day))}d ago`;
}

function formatTrend(delta, sample) {
  const d = Number(delta);
  const s = Number(sample);
  if (!Number.isFinite(d) || !Number.isFinite(s) || s <= 0) return "-";
  const pp = d * 100;
  const sign = pp > 0 ? "+" : "";
  const trendIcon = pp > 0 ? "UP" : pp < 0 ? "DOWN" : "FLAT";
  return `${trendIcon} ${sign}${pp.toFixed(1)}pp (${s} games)`;
}

export function LocalProfileMarker() {
  const [profile, setProfile] = useState({
    playerId: null,
    name: null,
    winrate: null,
    mainPack: null,
    mainPackShare: null,
    rankedSample: null,
    lastSeenAt: null,
    trendDelta: null,
    trendGames: null
  });
  useEffect(() => {
    const sync = () => setProfile(readLocalProfile());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(LOCAL_PROFILE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(LOCAL_PROFILE_EVENT, sync);
    };
  }, []);

  if (!profile.playerId) return null;

  const packSprite = getPackSprite(profile.mainPack);
  const displayName = profile.name || profile.playerId;
  const profileHref = `/profile?playerId=${encodeURIComponent(profile.playerId)}`;

  return (
    <div className="profile-marker-wrap">
      <Link
        href={profileHref}
        className="profile-marker"
        title={`Local profile: ${displayName} (${profile.playerId})`}
      >
        {packSprite ? (
          <img src={packSprite} alt="" className="profile-marker-pack" />
        ) : (
          <span className="profile-marker-pack profile-marker-pack-fallback">?</span>
        )}
        <span className="profile-marker-copy">
          <strong>{displayName}</strong>
          <small>WR {formatWinrate(profile.winrate)}</small>
        </span>
      </Link>

      <div className="profile-marker-hover" role="dialog" aria-label="Profile quick info">
        <div className="profile-marker-grid">
          <div><span>Last Seen</span><strong>{formatRelativeTime(profile.lastSeenAt)}</strong></div>
          <div><span>Ranked Sample</span><strong>{Number(profile.rankedSample || 0) > 0 ? Number(profile.rankedSample) : "-"}</strong></div>
          <div><span>Main Pack</span><strong>{profile.mainPack ? `${profile.mainPack} ${formatShare(profile.mainPackShare)}` : "-"}</strong></div>
          <div><span>Trend</span><strong>{formatTrend(profile.trendDelta, profile.trendGames)}</strong></div>
        </div>
      </div>
    </div>
  );
}
