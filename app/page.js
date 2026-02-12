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
  },
  aqua: {
    bg: "#ecfbfb",
    "bg-2": "#cdeff0",
    panel: "#f0fcfd",
    "panel-2": "#c2edf0",
    surface: "#f7ffff",
    ink: "#0f2a2e",
    muted: "#4f6c73",
    edge: "#b6dfe3",
    accent: "#3cb4b9",
    "accent-2": "#6dd7da",
    "accent-3": "#9fe7ea",
    glow: "rgba(60, 180, 185, 0.22)",
    "overlay-1": "rgba(6, 20, 24, 0.56)",
    "overlay-2": "rgba(6, 20, 24, 0.2)"
  },
  night: {
    bg: "#eef1f7",
    "bg-2": "#d2d8e6",
    panel: "#f4f6fb",
    "panel-2": "#c7d0e6",
    surface: "#f8f9fd",
    ink: "#141a28",
    muted: "#515c74",
    edge: "#b7c1d7",
    accent: "#5b79ff",
    "accent-2": "#7aa5ff",
    "accent-3": "#b2c7ff",
    glow: "rgba(91, 121, 255, 0.2)",
    "overlay-1": "rgba(8, 12, 24, 0.66)",
    "overlay-2": "rgba(8, 12, 24, 0.22)"
  },
  stone: {
    bg: "#f2f1ef",
    "bg-2": "#d9d4ce",
    panel: "#f7f4ef",
    "panel-2": "#d5cec5",
    surface: "#faf8f5",
    ink: "#201c18",
    muted: "#5a524b",
    edge: "#c8bfb5",
    accent: "#b06b4c",
    "accent-2": "#d2986b",
    "accent-3": "#e5c3a1",
    glow: "rgba(176, 107, 76, 0.2)",
    "overlay-1": "rgba(20, 16, 12, 0.6)",
    "overlay-2": "rgba(20, 16, 12, 0.22)"
  }
};

function pickTheme(name) {
  const lower = name.toLowerCase();
  if (lower.includes("arctic") || lower.includes("snow") || lower.includes("winter") || lower.includes("moon") || lower.includes("space") || lower.includes("lunar")) {
    return THEMES.cool;
  }
  if (lower.includes("desert") || lower.includes("savanna") || lower.includes("wildwest") || lower.includes("lava") || lower.includes("beach") || lower.includes("snack")) {
    return THEMES.warm;
  }
  if (lower.includes("underwater") || lower.includes("aquatic")) {
    return THEMES.aqua;
  }
  if (lower.includes("forest") || lower.includes("jungle") || lower.includes("farm") || lower.includes("field") || lower.includes("corn") || lower.includes("frontyard")) {
    return THEMES.forest;
  }
  if (lower.includes("cyber") || lower.includes("wizard") || lower.includes("pagoda") || lower.includes("castle")) {
    return THEMES.night;
  }
  if (lower.includes("dungeon") || lower.includes("cave") || lower.includes("sewer") || lower.includes("bridge") || lower.includes("school") || lower.includes("moneybin")) {
    return THEMES.stone;
  }
  return THEMES.forest;
}

function MultiSelect({ label, options, selected, onChange, placeholder }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options
      .filter((opt) => opt.name.toLowerCase().includes(term))
      .slice(0, 80);
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
              <button
                key={name}
                type="button"
                className="chip"
                onClick={() => removeItem(name)}
                title="Remove"
              >
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

function extractPids(input) {
  const ids = [];
  const regex = /"Pid"\s*:\s*"([a-fA-F0-9\-]{10,})"/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    ids.push(match[1]);
  }

  if (ids.length) return ids;

  return input
    .split(/\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getGameTypeIcon(matchType) {
  const type = (matchType || "unknown").toLowerCase();
  if (type === "ranked") return "/Sprite/Cosmetic/CrownHat.png";
  if (type === "arena") return "/Sprite/Food/Mushroom.png";
  if (type === "private") return "/Sprite/Toys/RelicFoamSword.png";
  return "/Sprite/Cosmetic/TrophyHat.png";
}

export default function Page() {
  const [bulkText, setBulkText] = useState("");
  const [ingestStatus, setIngestStatus] = useState("");
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    done: 0,
    active: false
  });
  const [progressPulse, setProgressPulse] = useState(0);
  const [meta, setMeta] = useState({ pets: [], perks: [], toys: [], packs: [] });
  const [filters, setFilters] = useState({
    player: "",
    opponent: "",
    eitherPlayer: false,
    packA: "",
    packB: "",
    excludeA: "",
    excludeB: "",
    mirrorMatch: false,
    petMode: "any",
    perkMode: "any",
    toyMode: "any",
    matchType: "any",
    petLevelName: "",
    petLevelMin: "",
    exactTeam: "",
    outcome: "",
    outcomeTurn: "",
    minWins: "",
    goldMin: "",
    goldMax: "",
    rollsMin: "",
    rollsMax: "",
    summonsMin: "",
    summonsMax: "",
    econSide: "either",
    startDate: "",
    endDate: "",
    tags: "",
    turn: "",
    sort: "created_at",
    order: "desc",
    pageSize: "10"
  });
  const [enabled, setEnabled] = useState({
    player: false,
    matchup: false,
    pets: false,
    perks: false,
    toys: false,
    turn: false,
    matchType: false
  });
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedPets, setSelectedPets] = useState([]);
  const [selectedPerks, setSelectedPerks] = useState([]);
  const [selectedToys, setSelectedToys] = useState([]);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [tagDraft, setTagDraft] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagStatus, setTagStatus] = useState("");
  const [showTagEditor, setShowTagEditor] = useState(false);
  const replayImageVersion = "2026-02-12-text-fix";

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
      .then((data) => setMeta(data))
      .catch(() => setMeta({ pets: [], perks: [], toys: [], packs: [] }));
  }, []);

  useEffect(() => {
    runSearch(null, 1);
  }, []);

  useEffect(() => {
    if (!bulkProgress.active) {
      setProgressPulse(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressPulse((prev) => (prev + 0.15) % 1);
    }, 150);
    return () => clearInterval(interval);
  }, [bulkProgress.active]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        setAdvancedEnabled((prev) => !prev);
      }
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleFilter(key) {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) {
        if (key === "player") setFilters((f) => ({ ...f, player: "", opponent: "", eitherPlayer: false }));
        if (key === "matchup") setFilters((f) => ({ ...f, packA: "", packB: "" }));
        if (key === "pets") setSelectedPets([]);
        if (key === "perks") setSelectedPerks([]);
        if (key === "toys") setSelectedToys([]);
        if (key === "turn") setFilters((f) => ({ ...f, turn: "" }));
        if (key === "matchType") setFilters((f) => ({ ...f, matchType: "any" }));
      }
      return next;
    });
  }

  function clearAllFilters() {
    setEnabled({ player: false, matchup: false, pets: false, perks: false, toys: false, turn: false, matchType: false });
    setAdvancedEnabled(false);
    setFilters((f) => ({
      ...f,
      player: "",
      opponent: "",
      eitherPlayer: false,
      packA: "",
      packB: "",
      excludeA: "",
      excludeB: "",
      mirrorMatch: false,
      petMode: "any",
      perkMode: "any",
      toyMode: "any",
      matchType: "any",
      petLevelName: "",
      petLevelMin: "",
      exactTeam: "",
      outcome: "",
      outcomeTurn: "",
      minWins: "",
      goldMin: "",
      goldMax: "",
      rollsMin: "",
      rollsMax: "",
      summonsMin: "",
      summonsMax: "",
      econSide: "either",
      startDate: "",
      endDate: "",
      tags: "",
      turn: ""
    }));
    setSelectedPets([]);
    setSelectedPerks([]);
    setSelectedToys([]);
    runSearch(null, 1);
  }

  async function ingestBulk(e) {
    if (e) e.preventDefault();
    const ids = extractPids(bulkText);
    if (!ids.length) {
      setIngestStatus("No participation IDs found.");
      return;
    }

    setBulkProgress({ total: ids.length, done: 0, active: true });
    setIngestStatus(`Uploading ${ids.length}...`);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    let processed = 0;

    for (const id of ids) {
      const res = await fetch("/api/replays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participationId: id })
      });
      const data = await res.json();
      if (!res.ok) {
        failed += 1;
      } else if (data.status === "exists") {
        skipped += 1;
      } else {
        inserted += 1;
      }
      processed += 1;
      setBulkProgress({ total: ids.length, done: processed, active: true });
    }

    setIngestStatus(`Uploaded ${inserted}, skipped ${skipped}, failed ${failed}`);
    setBulkProgress({ total: ids.length, done: ids.length, active: false });
    runSearch(null, 1);
  }

  async function runSearch(e, pageOverride) {
    if (e) e.preventDefault();
    const pageValue = pageOverride || 1;

    const params = new URLSearchParams();
    if (enabled.player) {
      if (filters.player) params.set("player", filters.player);
      if (filters.opponent) params.set("opponent", filters.opponent);
      if (filters.eitherPlayer) params.set("eitherPlayer", "true");
    }
    if (enabled.matchup) {
      if (filters.packA) params.set("packA", filters.packA);
      if (filters.packB) params.set("packB", filters.packB);
    }
    if (enabled.pets) {
      if (selectedPets.length) params.set("pet", selectedPets.join(","));
      params.set("petMode", filters.petMode);
    }
    if (enabled.perks) {
      if (selectedPerks.length) params.set("perk", selectedPerks.join(","));
      params.set("perkMode", filters.perkMode);
    }
    if (enabled.toys) {
      if (selectedToys.length) params.set("toy", selectedToys.join(","));
      params.set("toyMode", filters.toyMode);
    }
    if (enabled.turn && filters.turn) params.set("turn", filters.turn);
    if (enabled.matchType && filters.matchType && filters.matchType !== "any") {
      params.set("matchType", filters.matchType);
    }

    if (advancedEnabled) {
      if (filters.excludeA) params.set("excludeA", filters.excludeA);
      if (filters.excludeB) params.set("excludeB", filters.excludeB);
      if (filters.mirrorMatch) params.set("mirrorMatch", "true");
      if (filters.petLevelName) params.set("petLevelName", filters.petLevelName);
      if (filters.petLevelMin) params.set("petLevelMin", filters.petLevelMin);
      if (filters.exactTeam) params.set("exactTeam", filters.exactTeam);
      if (filters.outcome) params.set("outcome", filters.outcome);
      if (filters.outcomeTurn) params.set("outcomeTurn", filters.outcomeTurn);
      if (filters.minWins) params.set("minWins", filters.minWins);
      if (filters.goldMin) params.set("goldMin", filters.goldMin);
      if (filters.goldMax) params.set("goldMax", filters.goldMax);
      if (filters.rollsMin) params.set("rollsMin", filters.rollsMin);
      if (filters.rollsMax) params.set("rollsMax", filters.rollsMax);
      if (filters.summonsMin) params.set("summonsMin", filters.summonsMin);
      if (filters.summonsMax) params.set("summonsMax", filters.summonsMax);
      if (filters.econSide) params.set("econSide", filters.econSide);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.tags) params.set("tags", filters.tags);
    }

    params.set("page", String(pageValue));
    params.set("pageSize", String(filters.pageSize || "10"));
    params.set("sort", filters.sort);
    params.set("order", filters.order);

    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();

    setResults(data.results || []);
    setTotal(data.total || 0);
    setPage(data.page || pageValue);
  }

  async function openModal(replayId) {
    setModalOpen(true);
    setModalLoading(true);
    setModalData(null);
    try {
      const res = await fetch(`/api/replays/${replayId}`);
      const data = await res.json();
      if (res.ok) {
        setModalData(data);
      } else {
        setModalData({ error: data?.error || "Failed to load replay" });
      }
    } catch {
      setModalData({ error: "Failed to load replay" });
    } finally {
      setModalLoading(false);
    }
  }

  useEffect(() => {
    if (modalData?.replay) {
      const tags = Array.isArray(modalData.replay.tags) ? modalData.replay.tags : [];
      setTagDraft(tags.join(", "));
      setTagStatus("");
      setShowTagEditor(false);
    }
  }, [modalData]);

  async function saveTags() {
    if (!modalData?.replay?.id) return;
    setTagSaving(true);
    setTagStatus("");
    const tags = tagDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/replays/${modalData.replay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags })
      });
      const data = await res.json();
      if (!res.ok) {
        setTagStatus(data?.error || "Failed to update tags");
        return;
      }
      setModalData((prev) =>
        prev
          ? { ...prev, replay: { ...prev.replay, tags: data.tags || tags } }
          : prev
      );
      setTagStatus("Saved.");
    } catch {
      setTagStatus("Failed to update tags");
    } finally {
      setTagSaving(false);
    }
  }

  function maybeUnlockTags(event) {
    if (event?.shiftKey) {
      setShowTagEditor(true);
      setTagStatus("Tag editor unlocked.");
    }
  }

  const isArena = (type) => (type || "").toLowerCase() === "arena";
  const isMulti = (replay) => {
    if (!replay) return false;
    const activeCount = Number(replay.active_player_count ?? 0);
    return Number.isFinite(activeCount) && activeCount > 2;
  };

  const totalPages = Math.max(1, Math.ceil(total / Number(filters.pageSize || 10)));
  const rawPct = bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0;
  const pulseBoost = bulkProgress.active ? Math.min(0.9, progressPulse) : 0;
  const progressPct = Math.min(100, Math.floor(rawPct + pulseBoost));

  return (
    <main>
      <div className="top-nav">
        <Link href="/" className="nav-link active">Explorer</Link>
        <Link href="/stats" className="nav-link">Stats</Link>
      </div>
      <header className="hero">
        <div className="hero-copy">
          <h1>SAP Replay Explorer</h1>
          <p>Upload replays, explore matchups, and search by any metric you could need.</p>
        </div>
      </header>

      <section className="section" onClick={() => setShowSortMenu(false)}>
        <h2>Upload Replays</h2>
        <p className="muted">Paste a participation ID, multiple IDs, or replay JSONs. Example: {`{"Pid":"...","T":1}{"Pid":"...","T":1}`}</p>
        <form className="bulk" onSubmit={ingestBulk}>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste replay JSON objects or IDs here"
          />
          <button type="submit">Upload</button>
        </form>
        {bulkProgress.total > 0 && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
            <div className="progress-text">{progressPct}%</div>
          </div>
        )}
        <div className="status">{ingestStatus}</div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Search</h2>
          <div className="section-actions">
            <button type="button" className="ghost" onClick={clearAllFilters}>Clear Filters</button>
            <button className="secondary" type="button" onClick={(e) => runSearch(e, 1)}>Search</button>
          </div>
        </div>
        <div className="toggles">
          <button type="button" className={enabled.player ? "toggle active" : "toggle"} onClick={() => toggleFilter("player")}>Player</button>
          <button type="button" className={enabled.matchup ? "toggle active" : "toggle"} onClick={() => toggleFilter("matchup")}>Pack Matchup</button>
          <button type="button" className={enabled.pets ? "toggle active" : "toggle"} onClick={() => toggleFilter("pets")}>Pets</button>
          <button type="button" className={enabled.perks ? "toggle active" : "toggle"} onClick={() => toggleFilter("perks")}>Perks</button>
          <button type="button" className={enabled.toys ? "toggle active" : "toggle"} onClick={() => toggleFilter("toys")}>Toys</button>
          <button type="button" className={enabled.turn ? "toggle active" : "toggle"} onClick={() => toggleFilter("turn")}>Turn</button>
          <button type="button" className={enabled.matchType ? "toggle active" : "toggle"} onClick={() => toggleFilter("matchType")}>Game Type</button>
          <button
            type="button"
            className={advancedEnabled ? "toggle subtle active" : "toggle subtle"}
            onClick={() => setAdvancedEnabled((prev) => !prev)}
          >
            Advanced
          </button>
        </div>
        <form onSubmit={(e) => runSearch(e, 1)}>
          <div className="filters">
            {enabled.player && (
              <>
                <div className="field">
                  <label>Player</label>
                  <input
                    placeholder="Player name"
                    value={filters.player}
                    onChange={(e) => setFilters({ ...filters, player: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Opponent</label>
                  <input
                    placeholder="Opponent name"
                    value={filters.opponent}
                    onChange={(e) => setFilters({ ...filters, opponent: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Either Player</label>
                  <select
                    value={filters.eitherPlayer ? "yes" : "no"}
                    onChange={(e) => setFilters({ ...filters, eitherPlayer: e.target.value === "yes" })}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </>
            )}
            {enabled.matchup && (
              <>
                <div className="field">
                  <label>Pack A</label>
                  <select
                    value={filters.packA}
                    onChange={(e) => setFilters({ ...filters, packA: e.target.value })}
                  >
                    <option value="">Any</option>
                    {meta.packs.map((pack) => (
                      <option key={pack.id} value={pack.name}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Pack B</label>
                  <select
                    value={filters.packB}
                    onChange={(e) => setFilters({ ...filters, packB: e.target.value })}
                  >
                    <option value="">Any</option>
                    {meta.packs.map((pack) => (
                      <option key={pack.id} value={pack.name}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {enabled.pets && (
              <>
                <MultiSelect
                  label="Pets"
                  options={meta.pets}
                  selected={selectedPets}
                  onChange={setSelectedPets}
                  placeholder="Search pets and add"
                />
                <div className="field">
                  <label>Pet Mode</label>
                  <select
                    value={filters.petMode}
                    onChange={(e) => setFilters({ ...filters, petMode: e.target.value })}
                  >
                    <option value="any">Any of these</option>
                    <option value="all">All of these</option>
                  </select>
                </div>
              </>
            )}
            {enabled.perks && (
              <>
                <MultiSelect
                  label="Perks"
                  options={meta.perks}
                  selected={selectedPerks}
                  onChange={setSelectedPerks}
                  placeholder="Search perks and add"
                />
                <div className="field">
                  <label>Perk Mode</label>
                  <select
                    value={filters.perkMode}
                    onChange={(e) => setFilters({ ...filters, perkMode: e.target.value })}
                  >
                    <option value="any">Any of these</option>
                    <option value="all">All of these</option>
                  </select>
                </div>
              </>
            )}
            {enabled.toys && (
              <>
                <MultiSelect
                  label="Toys"
                  options={meta.toys}
                  selected={selectedToys}
                  onChange={setSelectedToys}
                  placeholder="Search toys and add"
                />
                <div className="field">
                  <label>Toy Mode</label>
                  <select
                    value={filters.toyMode}
                    onChange={(e) => setFilters({ ...filters, toyMode: e.target.value })}
                  >
                    <option value="any">Any of these</option>
                    <option value="all">All of these</option>
                  </select>
                </div>
              </>
            )}
            {enabled.turn && (
              <div className="field">
                <label>Turn</label>
                <input
                  placeholder="Turn"
                  value={filters.turn}
                  onChange={(e) => setFilters({ ...filters, turn: e.target.value })}
                />
              </div>
            )}
            {enabled.matchType && (
              <div className="field">
                <label>Game Type</label>
                <select
                  value={filters.matchType}
                  onChange={(e) => setFilters({ ...filters, matchType: e.target.value })}
                >
                  <option value="any">Any</option>
                  <option value="ranked">Ranked</option>
                  <option value="arena">Arena</option>
                  <option value="private">Private</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            )}
          </div>

          {advancedEnabled && (
            <div className="advanced">
              <div className="filters">
                <div className="field">
                  <label>Exclude Pack A</label>
                  <select
                    value={filters.excludeA}
                    onChange={(e) => setFilters({ ...filters, excludeA: e.target.value })}
                  >
                    <option value="">None</option>
                    {meta.packs.map((pack) => (
                      <option key={pack.id} value={pack.name}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Exclude Pack B</label>
                  <select
                    value={filters.excludeB}
                    onChange={(e) => setFilters({ ...filters, excludeB: e.target.value })}
                  >
                    <option value="">None</option>
                    {meta.packs.map((pack) => (
                      <option key={pack.id} value={pack.name}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Mirror Match</label>
                  <select
                    value={filters.mirrorMatch ? "yes" : "no"}
                    onChange={(e) => setFilters({ ...filters, mirrorMatch: e.target.value === "yes" })}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div className="field">
                  <label>Pet Level (Name)</label>
                  <input
                    placeholder="Pet name"
                    value={filters.petLevelName}
                    onChange={(e) => setFilters({ ...filters, petLevelName: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Pet Level (Min)</label>
                  <input
                    placeholder="3"
                    value={filters.petLevelMin}
                    onChange={(e) => setFilters({ ...filters, petLevelMin: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Exact Team (5 pets, comma)</label>
                  <input
                    placeholder="Ant, Fish, ..."
                    value={filters.exactTeam}
                    onChange={(e) => setFilters({ ...filters, exactTeam: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Outcome</label>
                  <select
                    value={filters.outcome}
                    onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="draw">Draw</option>
                  </select>
                </div>
                <div className="field">
                  <label>Outcome Turn</label>
                  <input
                    placeholder="Turn"
                    value={filters.outcomeTurn}
                    onChange={(e) => setFilters({ ...filters, outcomeTurn: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Min Wins</label>
                  <input
                    placeholder="8"
                    value={filters.minWins}
                    onChange={(e) => setFilters({ ...filters, minWins: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Economy Side</label>
                  <select
                    value={filters.econSide}
                    onChange={(e) => setFilters({ ...filters, econSide: e.target.value })}
                  >
                    <option value="either">Either</option>
                    <option value="player">Player</option>
                    <option value="opponent">Opponent</option>
                  </select>
                </div>
                <div className="field">
                  <label>Gold Min</label>
                  <input
                    placeholder="10"
                    value={filters.goldMin}
                    onChange={(e) => setFilters({ ...filters, goldMin: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Gold Max</label>
                  <input
                    placeholder="10"
                    value={filters.goldMax}
                    onChange={(e) => setFilters({ ...filters, goldMax: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Rolls Min</label>
                  <input
                    placeholder="4"
                    value={filters.rollsMin}
                    onChange={(e) => setFilters({ ...filters, rollsMin: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Rolls Max</label>
                  <input
                    placeholder="10"
                    value={filters.rollsMax}
                    onChange={(e) => setFilters({ ...filters, rollsMax: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Summons Min</label>
                  <input
                    placeholder="0"
                    value={filters.summonsMin}
                    onChange={(e) => setFilters({ ...filters, summonsMin: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Summons Max</label>
                  <input
                    placeholder="5"
                    value={filters.summonsMax}
                    onChange={(e) => setFilters({ ...filters, summonsMax: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Tags (comma)</label>
                  <input
                    placeholder="tournament, week1"
                    value={filters.tags}
                    onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Results</h2>
          <div className="results-actions">
            <div className="status">{total} results</div>
            <div className="sort-menu" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="icon-button"
                aria-label="Sort options"
                onClick={() => setShowSortMenu((prev) => !prev)}
              >
                Sort
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h10M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {showSortMenu && (
                <div className="sort-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="field">
                    <label>Sort</label>
                    <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                      <option value="created_at">Newest</option>
                      <option value="player_name">Player</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Order</label>
                    <select value={filters.order} onChange={(e) => setFilters({ ...filters, order: e.target.value })}>
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="results">
          {results.map((r) => (
            <div className="card" key={r.id} role="button" tabIndex={0} onClick={() => openModal(r.id)} onKeyDown={(e) => e.key === "Enter" && openModal(r.id)}>
              <div className="card-head">
                <h3>
                  <span className="name-line">{r.player_name || "Unknown Player"}</span>
                  <span className="name-line vs-line">vs</span>
                  {isArena(r.match_type) || isMulti(r) ? (
                    <span className="name-line world-name">The World</span>
                  ) : (
                    <span className="name-line">{r.opponent_name || "Unknown"}</span>
                  )}
                </h3>
                <div className="game-type">
                  <img
                    src={getGameTypeIcon(r.match_type)}
                    alt={r.match_type || "Unknown"}
                    style={{ transform: (r.match_type || "unknown").toLowerCase() === "ranked" ? "scale(1.15)" : "none" }}
                  />
                  <span
                    className="game-type-label"
                    style={{ fontSize: (r.match_type || "unknown").length > 6 ? "10px" : "11px" }}
                  >
                    {(r.match_type || "unknown").toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="muted">Matchup: {r.pack || "Unknown"} vs {r.opponent_pack || "Unknown"}</div>
              <div className="muted">Game Type: {(r.match_type || "unknown").toUpperCase()}</div>
              <div className="replay-image-wrap">
                <img
                  className="replay-image"
                  src={`/api/replays/${r.id}/image?v=${encodeURIComponent(r.created_at || replayImageVersion)}`}
                  alt="Replay"
                  onLoad={(e) => e.currentTarget.closest(".replay-image-wrap")?.classList.add("loaded")}
                  onError={(e) => e.currentTarget.closest(".replay-image-wrap")?.classList.add("loaded")}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => runSearch(null, page - 1)}>Prev</button>
          <div className="page-info">Page {page} / {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => runSearch(null, page + 1)}>Next</button>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Replay Details</h3>
              <button className="ghost" type="button" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            {modalLoading && <div className="muted">Loading...</div>}
            {!modalLoading && modalData?.error && <div className="muted">{modalData.error}</div>}
            {!modalLoading && modalData?.replay && (
              <>
                <div className="modal-grid">
                  <div><span className="label">Matchup</span><span>{modalData.replay.pack || "Unknown"} vs {modalData.replay.opponent_pack || "Unknown"}</span></div>
                  <div><span className="label">Game Type</span><span>{(modalData.replay.match_type || "unknown").toUpperCase()}</span></div>
                  <div><span className="label">Version</span><span>{modalData.replay.game_version || "?"}</span></div>
                  <div><span className="label">Participation</span><span>{modalData.replay.participation_id}</span></div>
                  <div><span className="label">Turns</span><span>{modalData.stats?.turns ?? "?"}</span></div>
                  <div><span className="label">Max Lives</span><span>{modalData.replay.max_lives ?? "?"}</span></div>
                  {modalData.replay.match_name && <div><span className="label">Match Name</span><span>{modalData.replay.match_name}</span></div>}
                  {modalData.replay.match_pack !== null && modalData.replay.match_pack !== undefined && (
                    <div><span className="label">Match Pack</span><span>{modalData.replay.match_pack}</span></div>
                  )}
                  {modalData.replay.max_player_count !== null && modalData.replay.max_player_count !== undefined && (
                    <div><span className="label">Max Players</span><span>{modalData.replay.max_player_count}</span></div>
                  )}
                  {modalData.replay.active_player_count !== null && modalData.replay.active_player_count !== undefined && (
                    <div><span className="label">Active Players</span><span>{modalData.replay.active_player_count}</span></div>
                  )}
                  {modalData.replay.spectator_mode !== null && modalData.replay.spectator_mode !== undefined && (
                    <div><span className="label">Spectator Mode</span><span>{modalData.replay.spectator_mode}</span></div>
                  )}
                </div>
                {showTagEditor && (
                  <div className="tag-editor">
                    <div className="tag-header">
                      <span className="label">Tags</span>
                      <span className="tag-list">
                        {modalData.replay.tags?.length ? modalData.replay.tags.join(", ") : "None"}
                      </span>
                    </div>
                    <div className="tag-input-row">
                      <input
                        placeholder="Add tags (comma-separated)"
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                      />
                      <button type="button" className="secondary" onClick={saveTags} disabled={tagSaving}>
                        {tagSaving ? "Saving..." : "Save Tags"}
                      </button>
                    </div>
                    {tagStatus ? <div className="tag-status">{tagStatus}</div> : null}
                  </div>
                )}
                <div className="modal-sides">
                  <div className={`modal-side ${modalData.stats?.last_outcome === 1 ? "winner" : ""}`}>
                    <h4>{modalData.replay.player_name || "Unknown Player"}</h4>
                    <div className="stat" onClick={maybeUnlockTags} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && maybeUnlockTags(e)}>
                      <span className="label">Gold Spent</span>
                      <span>{modalData.stats?.player_gold_spent ?? "?"}</span>
                    </div>
                    <div className="stat"><span className="label">Rolls</span><span>{modalData.stats?.player_rolls ?? "?"}</span></div>
                    <div className="stat"><span className="label">Unspent Gold</span><span>{modalData.stats?.player_unspent_gold ?? "?"}</span></div>
                  </div>
                  {!isArena(modalData.replay.match_type) && !isMulti(modalData.replay) && (
                    <div className={`modal-side ${modalData.stats?.last_outcome === 2 ? "winner" : ""}`}>
                      <h4>{modalData.replay.opponent_name || "Unknown"}</h4>
                      <div className="stat" onClick={maybeUnlockTags} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && maybeUnlockTags(e)}>
                        <span className="label">Gold Spent</span>
                        <span>{modalData.stats?.opponent_gold_spent ?? "?"}</span>
                      </div>
                      <div className="stat"><span className="label">Rolls</span><span>{modalData.stats?.opponent_rolls ?? "?"}</span></div>
                      <div className="stat"><span className="label">Unspent Gold</span><span>{modalData.stats?.opponent_unspent_gold ?? "?"}</span></div>
                    </div>
                  )}
                </div>
                <img
                  className="modal-image"
                  src={`/api/replays/${modalData.replay.id}/image?v=${encodeURIComponent(modalData.replay.created_at || replayImageVersion)}`}
                  alt="Replay"
                />
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
