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

function parseCsvList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGameTypeIcon(matchType) {
  const type = (matchType || "unknown").toLowerCase();
  if (type === "ranked") return "/Sprite/Cosmetic/CrownHat.png";
  if (type === "arena") return "/Sprite/Food/Mushroom.png";
  if (type === "private") return "/Sprite/Toys/RelicFoamSword.png";
  return "/Sprite/Cosmetic/TrophyHat.png";
}

const DEFAULT_FILTERS = {
  player: "",
  playerId: "",
  opponent: "",
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
};

const DEFAULT_ENABLED = {
  player: false,
  matchup: false,
  pets: false,
  perks: false,
  toys: false,
  turn: false,
  matchType: false
};

export default function Page() {
  const [bulkText, setBulkText] = useState("");
  const [ingestStatus, setIngestStatus] = useState("");
  const [ingestSummary, setIngestSummary] = useState({
    inserted: 0,
    skippedParticipation: 0,
    skippedMatch: 0,
    failed: 0,
    failedEntries: []
  });
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    done: 0,
    active: false
  });
  const [progressPulse, setProgressPulse] = useState(0);
  const [meta, setMeta] = useState({ pets: [], perks: [], toys: [], packs: [] });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED);
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
  const [shareStatus, setShareStatus] = useState("");
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

  function buildSearchParams({
    filtersValue = filters,
    enabledValue = enabled,
    selectedPetsValue = selectedPets,
    selectedPerksValue = selectedPerks,
    selectedToysValue = selectedToys,
    advancedEnabledValue = advancedEnabled,
    pageValue = 1
  } = {}) {
    const params = new URLSearchParams();
    if (enabledValue.player) {
      if (filtersValue.player) params.set("player", filtersValue.player);
      if (filtersValue.playerId) params.set("playerId", filtersValue.playerId);
      if (filtersValue.opponent) params.set("opponent", filtersValue.opponent);
    }
    if (enabledValue.matchup) {
      if (filtersValue.packA) params.set("packA", filtersValue.packA);
      if (filtersValue.packB) params.set("packB", filtersValue.packB);
      if (filtersValue.mirrorMatch) params.set("mirrorMatch", "true");
    }
    if (enabledValue.pets) {
      if (selectedPetsValue.length) params.set("pet", selectedPetsValue.join(","));
      params.set("petMode", filtersValue.petMode);
    }
    if (enabledValue.perks) {
      if (selectedPerksValue.length) params.set("perk", selectedPerksValue.join(","));
      params.set("perkMode", filtersValue.perkMode);
    }
    if (enabledValue.toys) {
      if (selectedToysValue.length) params.set("toy", selectedToysValue.join(","));
      params.set("toyMode", filtersValue.toyMode);
    }
    if (enabledValue.turn && filtersValue.turn) params.set("turn", filtersValue.turn);
    if (enabledValue.matchType && filtersValue.matchType && filtersValue.matchType !== "any") {
      params.set("matchType", filtersValue.matchType);
    }

    if (advancedEnabledValue) {
      if (filtersValue.excludeA) params.set("excludeA", filtersValue.excludeA);
      if (filtersValue.excludeB) params.set("excludeB", filtersValue.excludeB);
      if (filtersValue.petLevelName) params.set("petLevelName", filtersValue.petLevelName);
      if (filtersValue.petLevelMin) params.set("petLevelMin", filtersValue.petLevelMin);
      if (filtersValue.exactTeam) params.set("exactTeam", filtersValue.exactTeam);
      if (filtersValue.outcome) params.set("outcome", filtersValue.outcome);
      if (filtersValue.outcomeTurn) params.set("outcomeTurn", filtersValue.outcomeTurn);
      if (filtersValue.minWins) params.set("minWins", filtersValue.minWins);
      if (filtersValue.goldMin) params.set("goldMin", filtersValue.goldMin);
      if (filtersValue.goldMax) params.set("goldMax", filtersValue.goldMax);
      if (filtersValue.rollsMin) params.set("rollsMin", filtersValue.rollsMin);
      if (filtersValue.rollsMax) params.set("rollsMax", filtersValue.rollsMax);
      if (filtersValue.summonsMin) params.set("summonsMin", filtersValue.summonsMin);
      if (filtersValue.summonsMax) params.set("summonsMax", filtersValue.summonsMax);
      if (filtersValue.econSide) params.set("econSide", filtersValue.econSide);
      if (filtersValue.startDate) params.set("startDate", filtersValue.startDate);
      if (filtersValue.endDate) params.set("endDate", filtersValue.endDate);
      if (filtersValue.tags) params.set("tags", filtersValue.tags);
    }

    params.set("page", String(pageValue));
    params.set("pageSize", String(filtersValue.pageSize || "10"));
    params.set("sort", filtersValue.sort || "created_at");
    params.set("order", filtersValue.order || "desc");

    const enabledKeys = Object.entries(enabledValue)
      .filter(([, isOn]) => Boolean(isOn))
      .map(([key]) => key);
    if (enabledKeys.length) params.set("uiEnabled", enabledKeys.join(","));
    if (advancedEnabledValue) params.set("uiAdvanced", "1");

    return params;
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasQuery = Array.from(urlParams.keys()).length > 0;

    if (!hasQuery) {
      runSearch(null, 1);
      return;
    }

    const nextFilters = { ...DEFAULT_FILTERS };
    const nextEnabled = { ...DEFAULT_ENABLED };

    const assignText = (key) => {
      const value = urlParams.get(key);
      if (value !== null) nextFilters[key] = value;
    };

    assignText("player");
    assignText("playerId");
    assignText("opponent");
    assignText("packA");
    assignText("packB");
    assignText("excludeA");
    assignText("excludeB");
    assignText("petMode");
    assignText("perkMode");
    assignText("toyMode");
    assignText("matchType");
    assignText("petLevelName");
    assignText("petLevelMin");
    assignText("exactTeam");
    assignText("outcome");
    assignText("outcomeTurn");
    assignText("minWins");
    assignText("goldMin");
    assignText("goldMax");
    assignText("rollsMin");
    assignText("rollsMax");
    assignText("summonsMin");
    assignText("summonsMax");
    assignText("econSide");
    assignText("startDate");
    assignText("endDate");
    assignText("tags");
    assignText("turn");
    assignText("sort");
    assignText("order");
    assignText("pageSize");

    nextFilters.mirrorMatch = urlParams.get("mirrorMatch") === "true";

    const nextSelectedPets = parseCsvList(urlParams.get("pet"));
    const nextSelectedPerks = parseCsvList(urlParams.get("perk"));
    const nextSelectedToys = parseCsvList(urlParams.get("toy"));

    const uiEnabled = parseCsvList(urlParams.get("uiEnabled"));
    if (uiEnabled.length) {
      for (const key of uiEnabled) {
        if (key in nextEnabled) nextEnabled[key] = true;
      }
    } else {
      nextEnabled.player = Boolean(nextFilters.player || nextFilters.playerId || nextFilters.opponent);
      nextEnabled.matchup = Boolean(nextFilters.packA || nextFilters.packB || nextFilters.mirrorMatch);
      nextEnabled.pets = Boolean(nextSelectedPets.length);
      nextEnabled.perks = Boolean(nextSelectedPerks.length);
      nextEnabled.toys = Boolean(nextSelectedToys.length);
      nextEnabled.turn = Boolean(nextFilters.turn);
      nextEnabled.matchType = Boolean(nextFilters.matchType && nextFilters.matchType !== "any");
    }
    if (nextFilters.mirrorMatch) {
      nextEnabled.matchup = true;
    }

    const nextAdvancedEnabled =
      urlParams.get("uiAdvanced") === "1" ||
      Boolean(
        nextFilters.excludeA ||
          nextFilters.excludeB ||
          nextFilters.petLevelName ||
          nextFilters.petLevelMin ||
          nextFilters.exactTeam ||
          nextFilters.outcome ||
          nextFilters.outcomeTurn ||
          nextFilters.minWins ||
          nextFilters.goldMin ||
          nextFilters.goldMax ||
          nextFilters.rollsMin ||
          nextFilters.rollsMax ||
          nextFilters.summonsMin ||
          nextFilters.summonsMax ||
          nextFilters.startDate ||
          nextFilters.endDate ||
          nextFilters.tags
      );

    const nextPage = Math.max(1, Number(urlParams.get("page") || 1) || 1);

    setFilters(nextFilters);
    setEnabled(nextEnabled);
    setAdvancedEnabled(nextAdvancedEnabled);
    setSelectedPets(nextSelectedPets);
    setSelectedPerks(nextSelectedPerks);
    setSelectedToys(nextSelectedToys);

    const hydratedParams = buildSearchParams({
      filtersValue: nextFilters,
      enabledValue: nextEnabled,
      selectedPetsValue: nextSelectedPets,
      selectedPerksValue: nextSelectedPerks,
      selectedToysValue: nextSelectedToys,
      advancedEnabledValue: nextAdvancedEnabled,
      pageValue: nextPage
    });

    runSearch(null, nextPage, { paramsOverride: hydratedParams, skipUrlSync: true });
  }, []);

  function toggleFilter(key) {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) {
        if (key === "player") setFilters((f) => ({ ...f, player: "", playerId: "", opponent: "" }));
        if (key === "matchup") setFilters((f) => ({ ...f, packA: "", packB: "", mirrorMatch: false }));
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
    const resetFilters = { ...DEFAULT_FILTERS };
    const resetEnabled = { ...DEFAULT_ENABLED };
    setEnabled(resetEnabled);
    setAdvancedEnabled(false);
    setFilters(resetFilters);
    setSelectedPets([]);
    setSelectedPerks([]);
    setSelectedToys([]);
    const params = buildSearchParams({
      filtersValue: resetFilters,
      enabledValue: resetEnabled,
      selectedPetsValue: [],
      selectedPerksValue: [],
      selectedToysValue: [],
      advancedEnabledValue: false,
      pageValue: 1
    });
    runSearch(null, 1, { paramsOverride: params });
  }

  async function ingestBulk(e, idsOverride = null) {
    if (e) e.preventDefault();
    const ids = Array.isArray(idsOverride) ? idsOverride : extractPids(bulkText);
    if (!ids.length) {
      setIngestStatus("No participation IDs found.");
      setIngestSummary({
        inserted: 0,
        skippedParticipation: 0,
        skippedMatch: 0,
        failed: 0,
        failedEntries: []
      });
      return;
    }

    setBulkProgress({ total: ids.length, done: 0, active: true });
    setIngestStatus(`Uploading ${ids.length}...`);
    setIngestSummary({
      inserted: 0,
      skippedParticipation: 0,
      skippedMatch: 0,
      failed: 0,
      failedEntries: []
    });

    let inserted = 0;
    let skippedParticipation = 0;
    let skippedMatch = 0;
    let failed = 0;
    const failedEntries = [];
    let processed = 0;

    for (const id of ids) {
      const res = await fetch("/api/replays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participationId: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        failed += 1;
        failedEntries.push({
          participationId: id,
          reason: data?.error || `HTTP ${res.status}`
        });
      } else if (data.status === "exists_participation") {
        skippedParticipation += 1;
      } else if (data.status === "exists_match") {
        skippedMatch += 1;
      } else {
        inserted += 1;
      }
      processed += 1;
      setBulkProgress({ total: ids.length, done: processed, active: true });
    }

    setIngestStatus(
      `Uploaded ${inserted}, skipped by PID ${skippedParticipation}, skipped by Game ID ${skippedMatch}, failed ${failed}`
    );
    setIngestSummary({
      inserted,
      skippedParticipation,
      skippedMatch,
      failed,
      failedEntries
    });
    setBulkProgress({ total: ids.length, done: ids.length, active: false });
    runSearch(null, 1);
  }

  async function retryFailedUploads() {
    if (!ingestSummary.failedEntries.length) return;
    const failedIds = ingestSummary.failedEntries.map((item) => item.participationId);
    setBulkText(failedIds.join("\n"));
    await ingestBulk(null, failedIds);
  }

  async function runSearch(e, pageOverride, options = {}) {
    if (e) e.preventDefault();
    const pageValue = pageOverride || 1;
    const params = options.paramsOverride
      ? new URLSearchParams(options.paramsOverride.toString())
      : buildSearchParams({ pageValue });

    if (!params.get("page")) params.set("page", String(pageValue));
    const res = await fetch(`/api/search?${params.toString()}`);
    const data = await res.json();

    setResults(data.results || []);
    setTotal(data.total || 0);
    setPage(data.page || pageValue);

    if (!options.skipUrlSync) {
      const nextUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }

  async function copyShareLink() {
    try {
      const href = window.location.href;
      await navigator.clipboard.writeText(href);
      setShareStatus("Link copied.");
      setTimeout(() => setShareStatus(""), 1400);
    } catch {
      setShareStatus("Could not copy link.");
      setTimeout(() => setShareStatus(""), 1400);
    }
  }

  function applyExplorePreset(name) {
    const nextFilters = {
      ...DEFAULT_FILTERS,
      sort: filters.sort,
      order: filters.order,
      pageSize: filters.pageSize || "10"
    };
    const nextEnabled = { ...DEFAULT_ENABLED };
    let nextAdvanced = false;

    if (name === "ranked") {
      nextEnabled.matchType = true;
      nextFilters.matchType = "ranked";
    }

    if (name === "private") {
      nextEnabled.matchType = true;
      nextFilters.matchType = "private";
    }

    if (name === "arena") {
      nextEnabled.matchType = true;
      nextFilters.matchType = "arena";
    }

    if (name === "mirror") {
      nextEnabled.matchup = true;
      nextFilters.mirrorMatch = true;
    }

    setFilters(nextFilters);
    setEnabled(nextEnabled);
    setAdvancedEnabled(nextAdvanced);
    setSelectedPets([]);
    setSelectedPerks([]);
    setSelectedToys([]);

    const params = buildSearchParams({
      filtersValue: nextFilters,
      enabledValue: nextEnabled,
      selectedPetsValue: [],
      selectedPerksValue: [],
      selectedToysValue: [],
      advancedEnabledValue: nextAdvanced,
      pageValue: 1
    });
    runSearch(null, 1, { paramsOverride: params });
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

  async function copyPlayerId(playerId) {
    if (!playerId) return;
    try {
      await navigator.clipboard.writeText(playerId);
      setTagStatus(`Copied Player ID: ${playerId}`);
      setTimeout(() => setTagStatus(""), 1500);
    } catch {
      setTagStatus("Failed to copy Player ID");
      setTimeout(() => setTagStatus(""), 1500);
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
          <h1>Sap Library</h1>
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
        {(ingestSummary.inserted > 0 ||
          ingestSummary.skippedParticipation > 0 ||
          ingestSummary.skippedMatch > 0 ||
          ingestSummary.failed > 0) && (
          <div className="ingest-summary">
            <div><strong>Inserted:</strong> {ingestSummary.inserted}</div>
            <div><strong>Skipped (PID):</strong> {ingestSummary.skippedParticipation}</div>
            <div><strong>Skipped (Game ID):</strong> {ingestSummary.skippedMatch}</div>
            <div><strong>Failed:</strong> {ingestSummary.failed}</div>
          </div>
        )}
        {ingestSummary.failedEntries.length > 0 && (
          <div className="ingest-failures">
            <div className="ingest-failures-head">
              <span>Failed Replay IDs</span>
              <button type="button" className="ghost" onClick={retryFailedUploads}>
                Retry Failed
              </button>
            </div>
            <ul>
              {ingestSummary.failedEntries.map((item) => (
                <li key={`${item.participationId}-${item.reason}`}>
                  <code>{item.participationId}</code>
                  <span>{item.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Search</h2>
          <div className="section-actions">
            <button type="button" className="ghost" onClick={copyShareLink}>Copy Link</button>
            <button type="button" className="ghost" onClick={clearAllFilters}>Clear Filters</button>
            <button className="secondary" type="button" onClick={(e) => runSearch(e, 1)}>Search</button>
          </div>
        </div>
        {shareStatus ? <div className="status">{shareStatus}</div> : null}
        <div className="preset-row">
          <button type="button" className="ghost" onClick={() => applyExplorePreset("ranked")}>Ranked</button>
          <button type="button" className="ghost" onClick={() => applyExplorePreset("private")}>Private</button>
          <button type="button" className="ghost" onClick={() => applyExplorePreset("arena")}>Arena</button>
          <button type="button" className="ghost" onClick={() => applyExplorePreset("mirror")}>Mirror</button>
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
                  <label>Player ID</label>
                  <input
                    placeholder="Player UUID"
                    value={filters.playerId}
                    onChange={(e) => setFilters({ ...filters, playerId: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Player 2</label>
                  <input
                    placeholder="Second player name"
                    value={filters.opponent}
                    onChange={(e) => setFilters({ ...filters, opponent: e.target.value })}
                  />
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
                    style={{
                      transform:
                        (r.match_type || "unknown").toLowerCase() === "private"
                          ? "scaleX(-1)"
                          : (r.match_type || "unknown").toLowerCase() === "ranked"
                            ? "scale(1.15)"
                            : "none"
                    }}
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
                    <h4>
                      <button
                        type="button"
                        className="player-id-copy"
                        title={modalData.replay.player_id || "Player ID unavailable"}
                        onClick={() => copyPlayerId(modalData.replay.player_id)}
                      >
                        {modalData.replay.player_name || "Unknown Player"}
                      </button>
                    </h4>
                    <div className="stat" onClick={maybeUnlockTags} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && maybeUnlockTags(e)}>
                      <span className="label">Gold Spent</span>
                      <span>{modalData.stats?.player_gold_spent ?? "?"}</span>
                    </div>
                    <div className="stat"><span className="label">Rolls</span><span>{modalData.stats?.player_rolls ?? "?"}</span></div>
                    <div className="stat"><span className="label">Unspent Gold</span><span>{modalData.stats?.player_unspent_gold ?? "?"}</span></div>
                  </div>
                  {!isArena(modalData.replay.match_type) && !isMulti(modalData.replay) && (
                    <div className={`modal-side ${modalData.stats?.last_outcome === 2 ? "winner" : ""}`}>
                      <h4>
                        <button
                          type="button"
                          className="player-id-copy"
                          title={modalData.replay.opponent_id || "Player ID unavailable"}
                          onClick={() => copyPlayerId(modalData.replay.opponent_id)}
                        >
                          {modalData.replay.opponent_name || "Unknown"}
                        </button>
                      </h4>
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
