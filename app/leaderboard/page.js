"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

const EXCLUDED_PACKS = ["Custom", "Weekly"];

const DEFAULT_FILTERS = {
  scope: "game",
  search: "",
  minMatches: "1",
  pack: "",
  opponentPack: "",
  pet: [],
  perk: [],
  toy: [],
  minTurn: "",
  maxTurn: "",
  tags: "",
  sort: "games",
  order: "desc",
  pageSize: "25"
};

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

function parseCsvList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function fixed(value, digits = 2) {
  return Number(value || 0).toFixed(digits);
}

function IconMultiSelect({ label, options, selected, onChange, placeholder }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options.filter((opt) => opt.name.toLowerCase().includes(term)).slice(0, 80);
  }, [options, search]);

  const addItem = (name) => {
    if (selected.includes(name)) return;
    onChange([...selected, name]);
    setSearch("");
  };

  const removeItem = (name) => {
    onChange(selected.filter((item) => item !== name));
  };

  return (
    <div className="multi-select">
      <div className="multi-label">{label}</div>
      <input
        className="multi-input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="multi-list">
          {filtered.map((opt) => (
            <button
              key={opt.name}
              type="button"
              className="multi-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addItem(opt.name)}
            >
              <img src={opt.sprite} alt="" />
              <span>{opt.name}</span>
              <span className="multi-add">Add</span>
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="multi-chips">
          {selected.map((name) => {
            const opt = options.find((o) => o.name === name);
            return (
              <button key={name} type="button" className="chip" onClick={() => removeItem(name)} title="Remove">
                {opt?.sprite ? <img src={opt.sprite} alt="" /> : null}
                <span>{name}</span>
                <span className="chip-x">×</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [meta, setMeta] = useState({ pets: [], perks: [], toys: [], packs: [] });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / Number(filters.pageSize || 25)));
  const packOptions = useMemo(
    () => (meta.packs || []).filter((pack) => !EXCLUDED_PACKS.includes(pack.name)),
    [meta.packs]
  );

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
    fetch("/api/meta")
      .then((res) => res.json())
      .then((data) => setMeta({
        pets: data.pets || [],
        perks: data.perks || [],
        toys: data.toys || [],
        packs: data.packs || []
      }))
      .catch(() => setMeta({ pets: [], perks: [], toys: [], packs: [] }));
  }, []);

  function buildListParams(nextFilters = filters, nextPage = page, nextPlayerId = selectedPlayerId) {
    const params = new URLSearchParams();
    if (nextFilters.scope) params.set("scope", nextFilters.scope);
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.minMatches) params.set("minMatches", nextFilters.minMatches);
    if (nextFilters.pack) params.set("pack", nextFilters.pack);
    if (nextFilters.opponentPack) params.set("opponentPack", nextFilters.opponentPack);
    if (nextFilters.pet.length) params.set("pet", nextFilters.pet.join(","));
    if (nextFilters.perk.length) params.set("perk", nextFilters.perk.join(","));
    if (nextFilters.toy.length) params.set("toy", nextFilters.toy.join(","));
    if (nextFilters.scope === "battle") {
      if (nextFilters.minTurn) params.set("minTurn", nextFilters.minTurn);
      if (nextFilters.maxTurn) params.set("maxTurn", nextFilters.maxTurn);
    }
    if (nextFilters.tags) params.set("tags", nextFilters.tags);
    if (nextFilters.sort) params.set("sort", nextFilters.sort);
    if (nextFilters.order) params.set("order", nextFilters.order);
    if (nextFilters.pageSize) params.set("pageSize", nextFilters.pageSize);
    params.set("page", String(nextPage));
    if (nextPlayerId) params.set("playerId", nextPlayerId);
    return params;
  }

  function buildDetailParams(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.scope) params.set("scope", nextFilters.scope);
    if (nextFilters.pack) params.set("pack", nextFilters.pack);
    if (nextFilters.opponentPack) params.set("opponentPack", nextFilters.opponentPack);
    if (nextFilters.pet.length) params.set("pet", nextFilters.pet.join(","));
    if (nextFilters.perk.length) params.set("perk", nextFilters.perk.join(","));
    if (nextFilters.toy.length) params.set("toy", nextFilters.toy.join(","));
    if (nextFilters.scope === "battle") {
      if (nextFilters.minTurn) params.set("minTurn", nextFilters.minTurn);
      if (nextFilters.maxTurn) params.set("maxTurn", nextFilters.maxTurn);
    }
    if (nextFilters.tags) params.set("tags", nextFilters.tags);
    return params;
  }

  async function loadDetail(playerId, nextFilters = filters, options = {}) {
    if (!playerId) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    try {
      const params = buildDetailParams(nextFilters);
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(playerId)}?${params.toString()}`);
      const data = await res.json();
      setDetail(data);

      if (!options.skipUrlSync) {
        const nextParams = buildListParams(nextFilters, page, playerId);
        window.history.replaceState({}, "", `?${nextParams.toString()}`);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadLeaderboard(nextFilters = filters, nextPage = page, nextPlayerId = selectedPlayerId, options = {}) {
    const params = buildListParams(nextFilters, nextPage, nextPlayerId);
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      setPlayers(data.players || []);
      setTotal(Number(data.total || 0));
      setPage(Number(data.page || nextPage));

      if (!options.skipUrlSync) {
        window.history.replaceState({}, "", `?${params.toString()}`);
      }

      if (nextPlayerId) {
        await loadDetail(nextPlayerId, nextFilters, { skipUrlSync: true });
      } else {
        setDetail(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFilters = {
      ...DEFAULT_FILTERS,
      scope: params.get("scope") === "battle" ? "battle" : "game",
      search: params.get("search") || "",
      minMatches: params.get("minMatches") || "1",
      pack: params.get("pack") || "",
      opponentPack: params.get("opponentPack") || "",
      pet: parseCsvList(params.get("pet")),
      perk: parseCsvList(params.get("perk")),
      toy: parseCsvList(params.get("toy")),
      minTurn: params.get("minTurn") || "",
      maxTurn: params.get("maxTurn") || "",
      tags: params.get("tags") || "",
      sort: params.get("sort") || "games",
      order: params.get("order") || "desc",
      pageSize: params.get("pageSize") || "25"
    };
    const nextPage = Math.max(1, Number(params.get("page") || 1) || 1);
    const nextPlayerId = params.get("playerId") || "";

    setFilters(nextFilters);
    setSelectedPlayerId(nextPlayerId);
    loadLeaderboard(nextFilters, nextPage, nextPlayerId, { skipUrlSync: true });
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    loadLeaderboard(filters, 1, selectedPlayerId);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSelectedPlayerId("");
    setDetail(null);
    loadLeaderboard(DEFAULT_FILTERS, 1, "");
  }

  function selectPlayer(playerId) {
    setSelectedPlayerId(playerId);
    loadDetail(playerId);
    const nextParams = buildListParams(filters, page, playerId);
    window.history.replaceState({}, "", `?${nextParams.toString()}`);
  }

  return (
    <main>
      <div className="top-nav">
        <Link href="/" className="nav-link">Explorer</Link>
        <Link href="/stats" className="nav-link">Stats</Link>
        <Link href="/leaderboard" className="nav-link active">Leaderboard</Link>
      </div>

      <section className="hero">
        <div className="hero-copy">
          <h1>Sap Library</h1>
          <p>Player leaderboard and deep profile analytics by user ID.</p>
        </div>
      </section>

      <section className="section filters-section">
        <div className="section-head">
          <h2>Leaderboard Filters</h2>
        </div>
        <form onSubmit={submitSearch}>
          <div className="filters">
            <div className="field">
              <label>Scope</label>
              <select
                value={filters.scope}
                onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
              >
                <option value="game">Per Game</option>
                <option value="battle">Per Round</option>
              </select>
            </div>
            <div className="field">
              <label>Player Search (Name/ID)</label>
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search player name or user ID"
              />
            </div>
            <div className="field">
              <label>Min Match Threshold</label>
              <input
                value={filters.minMatches}
                onChange={(e) => setFilters({ ...filters, minMatches: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="field">
              <label>Your Pack</label>
              <select
                value={filters.pack}
                onChange={(e) => setFilters({ ...filters, pack: e.target.value })}
              >
                <option value="">Any</option>
                {packOptions.map((pack) => (
                  <option key={pack.id} value={pack.name}>{pack.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Opponent Pack</label>
              <select
                value={filters.opponentPack}
                onChange={(e) => setFilters({ ...filters, opponentPack: e.target.value })}
              >
                <option value="">Any</option>
                {packOptions.map((pack) => (
                  <option key={pack.id} value={pack.name}>{pack.name}</option>
                ))}
              </select>
            </div>
            {filters.scope === "battle" && (
              <>
                <div className="field">
                  <label>Min Turn</label>
                  <input
                    value={filters.minTurn}
                    onChange={(e) => setFilters({ ...filters, minTurn: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="field">
                  <label>Max Turn</label>
                  <input
                    value={filters.maxTurn}
                    onChange={(e) => setFilters({ ...filters, maxTurn: e.target.value })}
                    placeholder="15"
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>Sort</label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              >
                <option value="games">Games</option>
                <option value="rounds">Rounds</option>
                <option value="wins">Wins</option>
                <option value="losses">Losses</option>
                <option value="draws">Draws</option>
                <option value="winrate">Winrate</option>
                <option value="lossrate">Lossrate</option>
                <option value="drawrate">Drawrate</option>
                <option value="avg_rolls">Avg Rolls/Turn</option>
                <option value="avg_gold">Avg Gold/Turn</option>
                <option value="avg_summons">Avg Summons/Turn</option>
                <option value="player_name">Player Name</option>
              </select>
            </div>
            <div className="field">
              <label>Order</label>
              <select
                value={filters.order}
                onChange={(e) => setFilters({ ...filters, order: e.target.value })}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <div className="field">
              <label>Page Size</label>
              <select
                value={filters.pageSize}
                onChange={(e) => setFilters({ ...filters, pageSize: e.target.value })}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="field">
              <label>Tags (comma)</label>
              <input
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="tournament, finals"
              />
            </div>
            <IconMultiSelect
              label="Pet Filter"
              options={meta.pets || []}
              selected={filters.pet}
              onChange={(value) => setFilters({ ...filters, pet: value })}
              placeholder="Search pets and add"
            />
            <IconMultiSelect
              label="Perk Filter"
              options={meta.perks || []}
              selected={filters.perk}
              onChange={(value) => setFilters({ ...filters, perk: value })}
              placeholder="Search perks and add"
            />
            <IconMultiSelect
              label="Toy Filter"
              options={meta.toys || []}
              selected={filters.toy}
              onChange={(value) => setFilters({ ...filters, toy: value })}
              placeholder="Search toys and add"
            />
          </div>
          <div className="actions">
            <button type="submit">Search</button>
            <button type="button" className="secondary" onClick={resetFilters}>Reset</button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Global Leaderboard</h2>
          <div className="status">
            {loading ? "Loading..." : `${total} players`}
          </div>
        </div>

        <div className="leaderboard-table">
          <div className="leaderboard-row leaderboard-head">
            <span>Player</span>
            <span>Games</span>
            <span>Rounds</span>
            <span>Wins</span>
            <span>Losses</span>
            <span>Draws</span>
            <span>Winrate</span>
            <span>Avg Rolls</span>
            <span>Avg Gold</span>
          </div>
          {players.map((player) => (
            <button
              key={player.playerId}
              type="button"
              className={`leaderboard-row${selectedPlayerId === player.playerId ? " active" : ""}`}
              onClick={() => selectPlayer(player.playerId)}
            >
              <span className="player-cell">
                <strong>{player.playerName || "Unknown"}</strong>
                <small>{player.playerId}</small>
              </span>
              <span>{player.games}</span>
              <span>{player.rounds}</span>
              <span>{player.wins}</span>
              <span>{player.losses}</span>
              <span>{player.draws}</span>
              <span>{pct(player.winrate)}</span>
              <span>{fixed(player.avgRollsPerTurn)}</span>
              <span>{fixed(player.avgGoldPerTurn)}</span>
            </button>
          ))}
          {!loading && players.length === 0 && (
            <div className="leaderboard-empty">No players match these filters.</div>
          )}
        </div>

        <div className="pagination">
          <button disabled={page <= 1 || loading} onClick={() => loadLeaderboard(filters, page - 1, selectedPlayerId)}>
            Prev
          </button>
          <div className="page-info">Page {page} / {totalPages}</div>
          <button disabled={page >= totalPages || loading} onClick={() => loadLeaderboard(filters, page + 1, selectedPlayerId)}>
            Next
          </button>
        </div>
      </section>

      {selectedPlayerId && (
        <section className="section">
          <div className="results-header">
            <h2>Player Detail</h2>
            <div className="status">
              {detailLoading ? "Loading..." : (detail?.playerName || selectedPlayerId)}
            </div>
          </div>

          {detail && !detailLoading && (
            <>
              <div className="stats-summary-grid">
                <div className="stats-summary-item">
                  <span className="label">Player ID</span>
                  <strong style={{ fontSize: "12px", lineHeight: 1.2 }}>{detail.playerId}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Games</span>
                  <strong>{Number(detail.summary?.games || 0)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Rounds</span>
                  <strong>{Number(detail.summary?.rounds || 0)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Wins</span>
                  <strong>{Number(detail.summary?.wins || 0)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Losses</span>
                  <strong>{Number(detail.summary?.losses || 0)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Draws</span>
                  <strong>{Number(detail.summary?.draws || 0)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Winrate</span>
                  <strong>{pct(detail.summary?.winrate)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Lossrate</span>
                  <strong>{pct(detail.summary?.lossrate)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Drawrate</span>
                  <strong>{pct(detail.summary?.drawrate)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Avg Rolls/Turn</span>
                  <strong>{fixed(detail.summary?.avgRollsPerTurn)}</strong>
                </div>
                <div className="stats-summary-item">
                  <span className="label">Avg Gold/Turn</span>
                  <strong>{fixed(detail.summary?.avgGoldPerTurn)}</strong>
                </div>
              </div>

              <div className="leaderboard-detail-grid">
                <div className="leaderboard-detail-block">
                  <h3>Pack Pickrate</h3>
                  <div className="stats-cards">
                    {detail.packStats?.map((row) => (
                      <div className="stats-card" key={`pack-${row.pack}`}>
                        <div className="stats-card-head">
                          <h4>{row.pack}</h4>
                        </div>
                        <div className="stats-card-metrics">
                          <div>{filters.scope === "battle" ? "Rounds" : "Games"}: {Number(row.rounds ?? row.games ?? 0)}</div>
                          <div>Wins: {Number(row.wins || 0)}</div>
                          <div>Losses: {Number(row.losses || 0)}</div>
                          <div>Draws: {Number(row.draws || 0)}</div>
                          <div>Winrate: {pct(row.winrate)}</div>
                        </div>
                      </div>
                    ))}
                    {!detail.packStats?.length && <div className="stats-card empty">No pack stats.</div>}
                  </div>
                </div>

                <div className="leaderboard-detail-block">
                  <h3>Matchup Winrates</h3>
                  <div className="leaderboard-subtable">
                    <div className="leaderboard-subrow matchup head">
                      <span>Matchup</span>
                      <span>{filters.scope === "battle" ? "Rounds" : "Games"}</span>
                      <span>Wins</span>
                      <span>Losses</span>
                      <span>Draws</span>
                      <span>Winrate</span>
                    </div>
                    {detail.matchupStats?.map((row) => (
                      <div className="leaderboard-subrow matchup" key={`${row.pack}-${row.opponent_pack}`}>
                        <span>{row.pack} vs {row.opponent_pack}</span>
                        <span>{Number(row.rounds ?? row.games ?? 0)}</span>
                        <span>{Number(row.wins || 0)}</span>
                        <span>{Number(row.losses || 0)}</span>
                        <span>{Number(row.draws || 0)}</span>
                        <span>{pct(row.winrate)}</span>
                      </div>
                    ))}
                    {!detail.matchupStats?.length && (
                      <div className="leaderboard-subrow empty">
                        <span>No matchup stats.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="leaderboard-detail-block">
                <h3>Per Turn Metrics</h3>
                <div className="leaderboard-subtable">
                  <div className="leaderboard-subrow turn head">
                    <span>Turn</span>
                    <span>Rounds</span>
                    <span>Wins</span>
                    <span>Losses</span>
                    <span>Draws</span>
                    <span>Winrate</span>
                    <span>Avg Rolls</span>
                    <span>Avg Gold</span>
                  </div>
                  {detail.perTurn?.map((row) => (
                    <div className="leaderboard-subrow turn" key={`turn-${row.turn_number}`}>
                      <span>{row.turn_number}</span>
                      <span>{Number(row.rounds || 0)}</span>
                      <span>{Number(row.wins || 0)}</span>
                      <span>{Number(row.losses || 0)}</span>
                      <span>{Number(row.draws || 0)}</span>
                      <span>{pct(row.winrate)}</span>
                      <span>{fixed(row.avg_rolls_per_turn)}</span>
                      <span>{fixed(row.avg_gold_per_turn)}</span>
                    </div>
                  ))}
                  {!detail.perTurn?.length && (
                    <div className="leaderboard-subrow empty">
                      <span>No turn-level rows.</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
