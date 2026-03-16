"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackInlineName } from "@/app/components/pack-inline";
import { LocalProfileMarker } from "@/app/components/local-profile-marker";
import { fetchClientMeta } from "@/lib/clientMeta";

const BUILD_BACKGROUNDS = [
  "AboveCloudsBuild.png",
  "ArcticBuild.png",
  "AutumnForestBuild.png",
  "BeachBuild.png",
  "BridgeBuild.png",
  "CastleWallBuild.png",
  "CaveBuild.png",
  "ChildRoomBuild.png",
  "ChristmasCabinBuild.png",
  "ColosseumBuild.png",
  "CornFieldBuild.png",
  "CyberSpaceBuild.png",
  "DesertBuild.png",
  "DungeonBuild.png",
  "FarmBuild.png",
  "FieldBuild.png",
  "FoodLandBuild.png",
  "FrontYardBuild.png",
  "HalloweenStreetBuild.png",
  "InsideSecretBaseBuild.png",
  "JungleBuild.png",
  "LavaCaveBuild.png",
  "LavaMountainBuild.png",
  "LunarTempleBuild.png",
  "MoneyBinBuild.png",
  "MoonBuild.png",
  "PagodaBuild.png",
  "PlaygroundBuild.png",
  "SavannaBuild.png",
  "ScaryForestBuild.png",
  "SchoolHallwayBuild.png",
  "SewerBuild.png",
  "SnackBinBuild.png",
  "SnowBuild.png",
  "SpaceStationBuild.png",
  "UnderwaterBuild.png",
  "UrbanCityBuild.png",
  "WildWestTownBuild.png",
  "WinterPineForestBuild.png",
  "WizardSchoolBuild.png"
];

const THEMES = {
  cool: {
    bg: "#f3f6fb",
    "bg-2": "#e3ebf6",
    panel: "#f6f9ff",
    "panel-2": "#dbe8f7",
    surface: "#f9fbff",
    ink: "#0f1a2a",
    muted: "#4a5b76",
    edge: "#c7d6ea",
    accent: "#3aa7c9",
    "accent-2": "#6ac2f0",
    "accent-3": "#9ad7ff",
    glow: "rgba(74, 175, 230, 0.22)",
    "overlay-1": "rgba(9, 17, 34, 0.62)",
    "overlay-2": "rgba(9, 17, 34, 0.2)"
  },
  warm: {
    bg: "#fff0e3",
    "bg-2": "#ffd8c4",
    panel: "#fff3e9",
    "panel-2": "#ffcaa8",
    surface: "#fff7f0",
    ink: "#2a1408",
    muted: "#7a4b2f",
    edge: "#f2b68a",
    accent: "#ff8a3d",
    "accent-2": "#ffb062",
    "accent-3": "#ffd09a",
    glow: "rgba(255, 146, 84, 0.22)",
    "overlay-1": "rgba(40, 18, 8, 0.58)",
    "overlay-2": "rgba(40, 18, 8, 0.22)"
  },
  forest: {
    bg: "#eff6ee",
    "bg-2": "#d7ead4",
    panel: "#f3faf2",
    "panel-2": "#cfe8c9",
    surface: "#f7fbf6",
    ink: "#122414",
    muted: "#4c6a52",
    edge: "#bcd8bf",
    accent: "#3b9d64",
    "accent-2": "#6bc489",
    "accent-3": "#9fe2b6",
    glow: "rgba(59, 157, 100, 0.22)",
    "overlay-1": "rgba(9, 20, 12, 0.6)",
    "overlay-2": "rgba(9, 20, 12, 0.2)"
  }
};

const DEFAULT_FILTERS = {
  mode: "latest",
  runId: "",
  version: "current",
  matchType: "ranked",
  side: "both",
  pack: "",
  limit: "100"
};

const EMPTY_META = Object.freeze({
  pets: [],
  perks: [],
  toys: []
});

function buildSpriteMap(items) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.name && item?.sprite)
      .map((item) => [String(item.name).trim().toLowerCase(), item.sprite])
  );
}

function lookupSprite(map, name) {
  if (!name) return "";
  return map.get(String(name).trim().toLowerCase()) || "";
}

function pickTheme(name) {
  const lower = name.toLowerCase();
  if (lower.includes("arctic") || lower.includes("snow") || lower.includes("winter") || lower.includes("moon")) {
    return THEMES.cool;
  }
  if (lower.includes("desert") || lower.includes("savanna") || lower.includes("lava") || lower.includes("beach")) {
    return THEMES.warm;
  }
  return THEMES.forest;
}

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function toFixed(value, digits = 2) {
  return Number(value || 0).toFixed(digits);
}

function buildLatestParams(filters) {
  const params = new URLSearchParams();
  if (filters.version) params.set("version", filters.version);
  if (filters.matchType) params.set("matchType", filters.matchType);
  if (filters.side) params.set("side", filters.side);
  if (filters.pack) params.set("pack", filters.pack);
  if (filters.limit) params.set("limit", filters.limit);
  return params;
}

function buildRunParams(filters) {
  const params = new URLSearchParams();
  if (filters.side) params.set("side", filters.side);
  if (filters.pack) params.set("pack", filters.pack);
  if (filters.limit) params.set("limit", filters.limit);
  return params;
}

function configNameForMatchType(matchType) {
  const type = String(matchType || "ranked").trim().toLowerCase();
  if (type === "private") return "top-boards.private";
  if (type === "arena") return "top-boards.arena";
  return "top-boards.default";
}

export default function BoardsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [topData, setTopData] = useState({ run: null, items: [], total: 0 });
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [runActionLoading, setRunActionLoading] = useState(false);
  const [meta, setMeta] = useState(EMPTY_META);
  const petSpriteMap = useMemo(() => buildSpriteMap(meta.pets), [meta.pets]);
  const perkSpriteMap = useMemo(() => buildSpriteMap(meta.perks), [meta.perks]);
  const toySpriteMap = useMemo(() => buildSpriteMap(meta.toys), [meta.toys]);

  useEffect(() => {
    if (!BUILD_BACKGROUNDS.length) return;
    const choice = BUILD_BACKGROUNDS[Math.floor(Math.random() * BUILD_BACKGROUNDS.length)];
    const theme = pickTheme(choice);
    const root = document.documentElement;
    root.style.setProperty("--bg-image", `url("/Sprite/Background/${choice}")`);
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, []);

  useEffect(() => {
    let active = true;
    fetchClientMeta().then((data) => {
      if (!active) return;
      setMeta(data || EMPTY_META);
    });
    return () => {
      active = false;
    };
  }, []);

  async function loadRuns() {
    setLoadingRuns(true);
    try {
      const res = await fetch("/api/boards/runs?limit=30");
      const data = await res.json();
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
    } finally {
      setLoadingRuns(false);
    }
  }

  async function loadTop(nextFilters = filters, options = {}) {
    setLoadingBoards(true);
    try {
      let url = "";
      if (nextFilters.mode === "run" && nextFilters.runId) {
        const params = buildRunParams(nextFilters);
        url = `/api/boards/top/${encodeURIComponent(nextFilters.runId)}?${params.toString()}`;
      } else {
        const params = buildLatestParams(nextFilters);
        url = `/api/boards/top?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setTopData({ run: null, items: [], total: 0 });
        setStatus(data?.error || "Failed to load top boards.");
        setSelectedBoard(null);
        setBoardModalOpen(false);
        return;
      }

      setTopData({
        run: data.run || null,
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total || 0)
      });
      setStatus("");

      if (!options.keepSelection) {
        setSelectedBoard(null);
        setBoardModalOpen(false);
      }
    } finally {
      setLoadingBoards(false);
    }
  }

  async function startRun(force = false) {
    setRunActionLoading(true);
    try {
      const configName = configNameForMatchType(filters.matchType);
      const res = await fetch("/api/boards/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configName,
          createdBy: "ui",
          force
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data?.runId) {
          setStatus(`Run already in progress: ${data.runId}. Use Force Start to replace it.`);
          return;
        }
        setStatus(data?.error || "Failed to start run.");
        return;
      }
      setStatus(`Run queued: ${data.runId} (${configName})`);
      await loadRuns();
    } finally {
      setRunActionLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
    loadTop(DEFAULT_FILTERS);
  }, []);

  function applyFilters(e) {
    e.preventDefault();
    loadTop(filters);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    loadTop(DEFAULT_FILTERS);
    setSelectedBoard(null);
    setBoardModalOpen(false);
  }

  function selectBoard(item) {
    setSelectedBoard(item);
    setBoardModalOpen(true);
    setStatus("");
  }

  function closeBoardModal() {
    setBoardModalOpen(false);
  }

  useEffect(() => {
    if (!boardModalOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setBoardModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [boardModalOpen]);

  function buildReplayImageUrl(board) {
    if (!board?.replayId) return "";
    return `/api/replays/${encodeURIComponent(board.replayId)}/image?v=${encodeURIComponent(board.replayId)}`;
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Top Boards</h1>
          <p>Computed ranking of end-game boards using staged simulations and final round-robin validation.</p>
        </div>
        <nav className="top-nav">
          <Link href="/" className="nav-link">Explorer</Link>
          <Link href="/stats" className="nav-link">Stats</Link>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
          <Link href="/profile" className="nav-link">Profile</Link>
          <Link href="/boards" className="nav-link active">Boards</Link>
          <LocalProfileMarker />
        </nav>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Query</h2>
          <div className="section-actions">
            <button type="button" className="ghost" onClick={loadRuns} disabled={loadingRuns}>
              {loadingRuns ? "Refreshing..." : "Refresh Runs"}
            </button>
            <button type="button" className="secondary" onClick={startRun} disabled={runActionLoading}>
              {runActionLoading ? "Starting..." : "Start New Run"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => startRun(true)}
              disabled={runActionLoading}
              title="Force start by failing any stale running run"
            >
              {runActionLoading ? "Starting..." : "Force Start"}
            </button>
          </div>
        </div>
        {status ? <div className="status">{status}</div> : null}
        <form onSubmit={applyFilters}>
          <div className="filters">
            <div className="field">
              <label>Mode</label>
              <select
                value={filters.mode}
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
              >
                <option value="latest">Latest For Scope</option>
                <option value="run">Specific Run</option>
              </select>
            </div>

            {filters.mode === "run" && (
              <div className="field">
                <label>Run ID</label>
                <select
                  value={filters.runId}
                  onChange={(e) => setFilters({ ...filters, runId: e.target.value })}
                >
                  <option value="">Select run</option>
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.id} ({run.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>Version</label>
              <input
                value={filters.version}
                onChange={(e) => setFilters({ ...filters, version: e.target.value })}
                placeholder="current"
                disabled={filters.mode === "run"}
              />
            </div>

            <div className="field">
              <label>Match Type</label>
              <select
                value={filters.matchType}
                onChange={(e) => setFilters({ ...filters, matchType: e.target.value })}
                disabled={filters.mode === "run"}
              >
                <option value="ranked">ranked</option>
                <option value="private">private</option>
                <option value="arena">arena</option>
              </select>
            </div>

            <div className="field">
              <label>Side</label>
              <select
                value={filters.side}
                onChange={(e) => setFilters({ ...filters, side: e.target.value })}
              >
                <option value="both">both</option>
                <option value="player">player</option>
                <option value="opponent">opponent</option>
              </select>
            </div>

            <div className="field">
              <label>Pack</label>
              <input
                value={filters.pack}
                onChange={(e) => setFilters({ ...filters, pack: e.target.value })}
                placeholder="Any"
              />
            </div>

            <div className="field">
              <label>Limit</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button type="submit" disabled={loadingBoards}>
              {loadingBoards ? "Loading..." : "Load"}
            </button>
            <button type="button" className="secondary" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Top List</h2>
          <div className="status">
            {loadingBoards ? "Loading..." : `${topData.total} boards`}
            {topData.run?.id ? ` - Run ${topData.run.id}` : ""}
          </div>
        </div>

        <div className="boards-table-wrap">
          <table className="boards-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Pack</th>
                <th>Player</th>
                <th><span className="rate-win">Win%</span></th>
                <th><span className="rate-win">W</span>-<span className="rate-loss">L</span>-D</th>
                <th>Rating</th>
                <th>Replay</th>
              </tr>
            </thead>
            <tbody>
              {topData.items.map((item) => (
                <tr
                  key={item.boardId}
                  className={selectedBoard?.boardId === item.boardId ? "active" : ""}
                  onClick={() => selectBoard(item)}
                >
                  <td>{item.rank}</td>
                  <td className="boards-pack-cell">
                    {item.pack ? <PackInlineName name={item.pack} className="pack-name-inline" /> : "?"}
                  </td>
                  <td>{item.playerName || "?"}</td>
                  <td className="rate-win">{formatPct(item.winRate)}</td>
                  <td>
                    <span className="boards-record-inline">
                      <span className="rate-win">{item.wins}W</span>
                      <span className="boards-record-sep">-</span>
                      <span className="rate-loss">{item.losses}L</span>
                      <span className="boards-record-sep">-</span>
                      <span>{item.draws}D</span>
                    </span>
                  </td>
                  <td>{toFixed(item.rating, 1)}</td>
                  <td>{item.replayId}</td>
                </tr>
              ))}
              {!loadingBoards && topData.items.length === 0 && (
                <tr>
                  <td colSpan={7}>No rows.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {boardModalOpen && selectedBoard && (
        <div className="modal-backdrop" onClick={closeBoardModal}>
          <div className="modal boards-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Board Detail</h3>
              <div className="modal-head-actions">
                <button className="ghost" type="button" onClick={closeBoardModal}>Close</button>
              </div>
            </div>
            <div className="boards-modal-grid">
              <div className="boards-detail-card">
                <h3>Snapshot</h3>
                <div><strong>Board ID:</strong> {selectedBoard.boardId}</div>
                <div>
                  <strong>Pack:</strong>{" "}
                  {selectedBoard.pack ? <PackInlineName name={selectedBoard.pack} className="pack-name-inline" /> : "?"}
                </div>
                <div><strong>Player:</strong> {selectedBoard.playerName || "?"}</div>
                <div><strong>Rank:</strong> {selectedBoard.rank}</div>
                <div><strong>Rating:</strong> {toFixed(selectedBoard.rating, 1)}</div>
                <div><strong>Win Rate:</strong> <span className="rate-win">{formatPct(selectedBoard.winRate)}</span></div>
                <div>
                  <strong>Record:</strong>{" "}
                  <span className="boards-record-inline">
                    <span className="rate-win">{selectedBoard.wins}W</span>
                    <span className="boards-record-sep">-</span>
                    <span className="rate-loss">{selectedBoard.losses}L</span>
                    <span className="boards-record-sep">-</span>
                    <span>{selectedBoard.draws}D</span>
                  </span>
                </div>
                <div><strong>Replay ID:</strong> {selectedBoard.replayId || "?"}</div>
                <div><strong>Turn:</strong> {selectedBoard.turnNumber}</div>
                <div>
                  <strong>Toy:</strong>{" "}
                  {selectedBoard.preview?.toy?.name
                    ? (
                      <span className="boards-inline-entity">
                        {lookupSprite(toySpriteMap, selectedBoard.preview.toy.name)
                          ? (
                            <img
                              src={lookupSprite(toySpriteMap, selectedBoard.preview.toy.name)}
                              alt=""
                              aria-hidden="true"
                            />
                          )
                          : null}
                        <span>{selectedBoard.preview.toy.name} (L{selectedBoard.preview.toy.level || 1})</span>
                      </span>
                    )
                    : "None"}
                </div>
                <div className="boards-pet-list">
                  {(selectedBoard.preview?.pets || []).map((pet) => (
                    <div className="boards-pet-row" key={`${selectedBoard.boardId}-${pet.slot}`}>
                      <span className="boards-pet-slot">#{pet.slot}</span>
                      <span className="boards-inline-entity">
                        {lookupSprite(petSpriteMap, pet.name)
                          ? <img src={lookupSprite(petSpriteMap, pet.name)} alt="" aria-hidden="true" />
                          : null}
                        <span>{pet.name}</span>
                      </span>
                      <span>{pet.attack}/{pet.health}</span>
                      {pet.perk
                        ? (
                          <span className="boards-inline-entity boards-pet-perk">
                            <span className="boards-pet-perk-label">Perk:</span>
                            {lookupSprite(perkSpriteMap, pet.perk)
                              ? <img src={lookupSprite(perkSpriteMap, pet.perk)} alt="" aria-hidden="true" />
                              : null}
                            <span>{pet.perk}</span>
                          </span>
                        )
                        : null}
                    </div>
                  ))}
                  {!selectedBoard.preview?.pets?.length && <div className="muted">No pet snapshot available.</div>}
                </div>
              </div>
              <div className="boards-detail-card">
                <h3>Source Game Image</h3>
                {selectedBoard.replayId ? (
                  <div className="replay-image-wrap boards-modal-image-wrap">
                    <img
                      className="boards-modal-image"
                      src={buildReplayImageUrl(selectedBoard)}
                      alt={`Replay ${selectedBoard.replayId}`}
                      loading="lazy"
                      decoding="async"
                      onLoad={(e) => e.currentTarget.closest(".boards-modal-image-wrap")?.classList.add("loaded")}
                      onError={(e) => e.currentTarget.closest(".boards-modal-image-wrap")?.classList.add("loaded")}
                    />
                  </div>
                ) : (
                  <div className="muted">No replay image available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
