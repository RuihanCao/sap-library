"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getPackSprite } from "@/lib/packSprites";
import { SemanticLabel } from "@/app/components/semantic-label";
import { PackMatchupInline } from "@/app/components/pack-inline";

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

const EXCLUDED_PACKS = ["Custom", "Weekly"];
const defaultSortForScope = (scope) => (scope === "battle" ? "winrate" : "pickrate");
const FILTER_FALLBACK_SPRITES = {
  pet: "/Sprite/Pets/Turtle.png",
  perk: "/Sprite/Food/Honey.png",
  toy: "/Sprite/Toys/RelicFoamSword.png",
  turn: "/hourglass-twemoji.png"
};

function parseCsvList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSortMetric(value) {
  return value === "presence" ? "pickrate" : value;
}

function pickFilterSprite(list, fallbackSprite) {
  const sprite = Array.isArray(list) ? list.find((item) => item?.sprite)?.sprite : "";
  return sprite || fallbackSprite;
}

const DEFAULT_STATS_FILTERS = {
  scope: "game",
  player: "",
  playerId: "",
  version: "current",
  pack: "",
  opponentPack: "",
  winningPack: "",
  losingPack: "",
  excludePack: "",
  excludeMirrors: false,
  minSample: "10",
  minEndOn: "",
  minElo: "",
  maxElo: "",
  itemPack: "",
  minTurn: "",
  maxTurn: "",
  pet: [],
  petLevel: "",
  perk: [],
  toy: [],
  allyPet: [],
  opponentPet: [],
  allyPerk: [],
  opponentPerk: [],
  allyToy: [],
  opponentToy: [],
  tags: ""
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

function formatPct(value) {
  if (!Number.isFinite(value)) return "0.00%";
  const clamped = Math.max(0, Math.min(1, value));
  return `${(clamped * 100).toFixed(2)}%`;
}

function formatTurns(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toFixed(2);
}

function IconSelect({ label, options, value, onChange, placeholder }) {
  const [search, setSearch] = useState(value || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options
      .filter((opt) => opt.name.toLowerCase().includes(term))
      .slice(0, 80);
  }, [options, search]);

  const selectItem = (name) => {
    onChange(name);
    setSearch(name);
  };

  return (
    <div className="multi-select">
      <div className="multi-label">{label}</div>
      <input
        className="multi-input"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
        }}
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
              onClick={() => selectItem(opt.name)}
            >
              <img src={opt.sprite} alt="" />
              <span>{opt.name}</span>
              <span className="multi-add">Pick</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconMultiSelect({ label, options, selected, onChange, placeholder }) {
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
      {label ? <div className="multi-label">{label}</div> : null}
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

export default function StatsPage() {
  const [meta, setMeta] = useState({
    pets: [],
    perks: [],
    toys: [],
    packs: [],
    versions: [],
    currentVersion: null
  });
  const [filters, setFilters] = useState(DEFAULT_STATS_FILTERS);
  const [stats, setStats] = useState({
    totalGames: 0,
    totalBattles: 0,
    generatedAt: null,
    newestEntryAt: null,
    packStats: [],
    matchupStats: [],
    petStats: [],
    perkStats: [],
    toyStats: []
  });
  const [loading, setLoading] = useState(false);
  const [petSort, setPetSort] = useState(defaultSortForScope(DEFAULT_STATS_FILTERS.scope));
  const [petOrder, setPetOrder] = useState("desc");
  const [perkSort, setPerkSort] = useState(defaultSortForScope(DEFAULT_STATS_FILTERS.scope));
  const [perkOrder, setPerkOrder] = useState("desc");
  const [toySort, setToySort] = useState(defaultSortForScope(DEFAULT_STATS_FILTERS.scope));
  const [toyOrder, setToyOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("card");
  const [sortMenuOpen, setSortMenuOpen] = useState({
    pet: false,
    perk: false,
    toy: false
  });
  const [collapsed, setCollapsed] = useState({
    pack: false,
    matchup: false,
    pet: false,
    perk: false,
    toy: false
  });
  const [shareStatus, setShareStatus] = useState("");

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
        packs: data.packs || [],
        versions: data.versions || [],
        currentVersion: data.currentVersion || null
      }))
      .catch(() =>
        setMeta({
          pets: [],
          perks: [],
          toys: [],
          packs: [],
          versions: [],
          currentVersion: null
        })
      );
  }, []);

  const packOptions = useMemo(() => meta.packs.filter((pack) => !EXCLUDED_PACKS.includes(pack.name)), [meta.packs]);
  const petOptions = useMemo(() => meta.pets, [meta.pets]);
  const perkOptions = useMemo(() => meta.perks, [meta.perks]);
  const toyOptions = useMemo(() => meta.toys, [meta.toys]);
  const petFilterSprite = pickFilterSprite(meta.pets, FILTER_FALLBACK_SPRITES.pet);
  const perkFilterSprite = pickFilterSprite(meta.perks, FILTER_FALLBACK_SPRITES.perk);
  const toyFilterSprite = pickFilterSprite(meta.toys, FILTER_FALLBACK_SPRITES.toy);
  const turnFilterSprite = FILTER_FALLBACK_SPRITES.turn;

  function buildStatsParams(
    nextFilters = filters,
    uiState = {
      viewModeValue: viewMode,
      petSortValue: petSort,
      petOrderValue: petOrder,
      perkSortValue: perkSort,
      perkOrderValue: perkOrder,
      toySortValue: toySort,
      toyOrderValue: toyOrder
    }
  ) {
    const params = new URLSearchParams();
    if (nextFilters.scope) params.set("scope", nextFilters.scope);
    if (nextFilters.player) params.set("player", nextFilters.player);
    if (nextFilters.playerId) params.set("playerId", nextFilters.playerId);
    if (nextFilters.version) params.set("version", nextFilters.version);
    if (nextFilters.pack) params.set("pack", nextFilters.pack);
    if (nextFilters.opponentPack) params.set("opponentPack", nextFilters.opponentPack);
    if (nextFilters.winningPack) params.set("winningPack", nextFilters.winningPack);
    if (nextFilters.losingPack) params.set("losingPack", nextFilters.losingPack);
    if (nextFilters.excludePack) params.set("excludePack", nextFilters.excludePack);
    if (nextFilters.excludeMirrors) params.set("excludeMirrors", "true");
    if (nextFilters.minSample) params.set("minSample", nextFilters.minSample);
    if (nextFilters.minEndOn) params.set("minEndOn", nextFilters.minEndOn);
    if (nextFilters.minElo) params.set("minElo", nextFilters.minElo);
    if (nextFilters.maxElo) params.set("maxElo", nextFilters.maxElo);
    if (nextFilters.itemPack) params.set("itemPack", nextFilters.itemPack);
    if (nextFilters.minTurn) params.set("minTurn", nextFilters.minTurn);
    if (nextFilters.maxTurn) params.set("maxTurn", nextFilters.maxTurn);
    if (nextFilters.pet?.length) params.set("pet", nextFilters.pet.join(","));
    if (nextFilters.petLevel) params.set("petLevel", nextFilters.petLevel);
    if (nextFilters.perk?.length) params.set("perk", nextFilters.perk.join(","));
    if (nextFilters.toy?.length) params.set("toy", nextFilters.toy.join(","));
    if (nextFilters.allyPet?.length) params.set("allyPet", nextFilters.allyPet.join(","));
    if (nextFilters.opponentPet?.length) params.set("opponentPet", nextFilters.opponentPet.join(","));
    if (nextFilters.allyPerk?.length) params.set("allyPerk", nextFilters.allyPerk.join(","));
    if (nextFilters.opponentPerk?.length) params.set("opponentPerk", nextFilters.opponentPerk.join(","));
    if (nextFilters.allyToy?.length) params.set("allyToy", nextFilters.allyToy.join(","));
    if (nextFilters.opponentToy?.length) params.set("opponentToy", nextFilters.opponentToy.join(","));
    if (nextFilters.tags) params.set("tags", nextFilters.tags);

    params.set("uiView", uiState.viewModeValue || "card");
    params.set("uiPetSort", uiState.petSortValue || defaultSortForScope(nextFilters.scope));
    params.set("uiPetOrder", uiState.petOrderValue || "desc");
    params.set("uiPerkSort", uiState.perkSortValue || defaultSortForScope(nextFilters.scope));
    params.set("uiPerkOrder", uiState.perkOrderValue || "desc");
    params.set("uiToySort", uiState.toySortValue || defaultSortForScope(nextFilters.scope));
    params.set("uiToyOrder", uiState.toyOrderValue || "desc");

    return params;
  }

  async function loadStats(nextFilters = filters, options = {}) {
    const params = options.paramsOverride
      ? new URLSearchParams(options.paramsOverride.toString())
      : buildStatsParams(nextFilters, options.uiState);

    setLoading(true);
    try {
      const res = await fetch(`/api/stats?${params.toString()}`);
      const data = await res.json();
      setStats({
        totalGames: data.totalGames || 0,
        totalBattles: data.totalBattles || 0,
        generatedAt: data.generatedAt || null,
        newestEntryAt: data.newestEntryAt || null,
        packStats: data.packStats || [],
        matchupStats: data.matchupStats || [],
        petStats: data.petStats || [],
        perkStats: data.perkStats || [],
        toyStats: data.toyStats || []
      });

      if (!options.skipUrlSync) {
        const nextUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, "", nextUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasQuery = Array.from(urlParams.keys()).length > 0;

    if (!hasQuery) {
      loadStats(DEFAULT_STATS_FILTERS);
      return;
    }

    const nextFilters = {
      ...DEFAULT_STATS_FILTERS,
      scope: urlParams.get("scope") || "game",
      player: urlParams.get("player") || "",
      playerId: urlParams.get("playerId") || "",
      version: urlParams.get("version") || "current",
      pack: urlParams.get("pack") || "",
      opponentPack: urlParams.get("opponentPack") || "",
      winningPack: urlParams.get("winningPack") || "",
      losingPack: urlParams.get("losingPack") || "",
      excludePack: urlParams.get("excludePack") || "",
      excludeMirrors: urlParams.get("excludeMirrors") === "true",
      minSample: urlParams.get("minSample") || "10",
      minEndOn: urlParams.get("minEndOn") || "",
      minElo: urlParams.get("minElo") || "",
      maxElo: urlParams.get("maxElo") || "",
      itemPack: urlParams.get("itemPack") || "",
      minTurn: urlParams.get("minTurn") || "",
      maxTurn: urlParams.get("maxTurn") || "",
      pet: parseCsvList(urlParams.get("pet")),
      petLevel: urlParams.get("petLevel") || "",
      perk: parseCsvList(urlParams.get("perk")),
      toy: parseCsvList(urlParams.get("toy")),
      allyPet: parseCsvList(urlParams.get("allyPet")),
      opponentPet: parseCsvList(urlParams.get("opponentPet")),
      allyPerk: parseCsvList(urlParams.get("allyPerk")),
      opponentPerk: parseCsvList(urlParams.get("opponentPerk")),
      allyToy: parseCsvList(urlParams.get("allyToy")),
      opponentToy: parseCsvList(urlParams.get("opponentToy")),
      tags: urlParams.get("tags") || ""
    };

    const nextViewMode = urlParams.get("uiView") || "card";
    const nextPetSort = normalizeSortMetric(urlParams.get("uiPetSort") || defaultSortForScope(nextFilters.scope));
    const nextPetOrder = urlParams.get("uiPetOrder") || "desc";
    const nextPerkSort = normalizeSortMetric(urlParams.get("uiPerkSort") || defaultSortForScope(nextFilters.scope));
    const nextPerkOrder = urlParams.get("uiPerkOrder") || "desc";
    const nextToySort = normalizeSortMetric(urlParams.get("uiToySort") || defaultSortForScope(nextFilters.scope));
    const nextToyOrder = urlParams.get("uiToyOrder") || "desc";

    setFilters(nextFilters);
    setViewMode(nextViewMode === "list" ? "list" : "card");
    setPetSort(nextPetSort);
    setPetOrder(nextPetOrder === "desc" ? "desc" : "asc");
    setPerkSort(nextPerkSort);
    setPerkOrder(nextPerkOrder === "desc" ? "desc" : "asc");
    setToySort(nextToySort);
    setToyOrder(nextToyOrder === "desc" ? "desc" : "asc");

    const hydratedParams = buildStatsParams(nextFilters, {
      viewModeValue: nextViewMode,
      petSortValue: nextPetSort,
      petOrderValue: nextPetOrder,
      perkSortValue: nextPerkSort,
      perkOrderValue: nextPerkOrder,
      toySortValue: nextToySort,
      toyOrderValue: nextToyOrder
    });

    loadStats(nextFilters, { paramsOverride: hydratedParams, skipUrlSync: true });
  }, []);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Link copied.");
      setTimeout(() => setShareStatus(""), 1400);
    } catch {
      setShareStatus("Could not copy link.");
      setTimeout(() => setShareStatus(""), 1400);
    }
  }

  function toggleCollapsed(sectionKey) {
    setCollapsed((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  const petSprite = (name) => petOptions.find((pet) => pet.name === name)?.sprite;
  const perkSprite = (name) => perkOptions.find((perk) => perk.name === name)?.sprite;
  const toySprite = (name) => toyOptions.find((toy) => toy.name === name)?.sprite;
  const packSprite = (name) => getPackSprite(name);
  const packOrderMap = {
    Turtle: 0,
    Puppy: 1,
    Star: 2,
    Golden: 3,
    Unicorn: 4,
    Danger: 5,
    Custom: 6,
    Weekly: 7,
    Unassigned: 99
  };
  const petMetaMap = useMemo(() => new Map((petOptions || []).map((entry) => [entry.name, entry])), [petOptions]);
  const perkMetaMap = useMemo(() => new Map((perkOptions || []).map((entry) => [entry.name, entry])), [perkOptions]);
  const toyMetaMap = useMemo(() => new Map((toyOptions || []).map((entry) => [entry.name, entry])), [toyOptions]);
  const itemPackFilter = filters.itemPack || "";
  const appearanceLabel = filters.scope === "battle" ? "Round Share" : "Appearance Rate";
  const itemSortOptions = filters.scope === "battle"
    ? [
        { value: "name", label: "Name" },
        { value: "pack", label: "Pack Group" },
        { value: "tier", label: "Tier" },
        { value: "count", label: "Rounds" },
        { value: "winrate", label: "Winrate" },
        { value: "lossrate", label: "Lossrate" },
        { value: "drawrate", label: "Drawrate" }
      ]
    : [
        { value: "name", label: "Name" },
        { value: "pack", label: "Pack Group" },
        { value: "tier", label: "Tier" },
        { value: "buyCount", label: "Buy Count" },
        { value: "pickrate", label: appearanceLabel },
        { value: "buyWinrate", label: "Winrate (Buy)" },
        { value: "buyLossrate", label: "Lossrate (Buy)" },
        { value: "endCount", label: "End Count" },
        { value: "endRate", label: "End Rate" },
        { value: "endWinrate", label: "Winrate (End)" },
        { value: "endLossrate", label: "Lossrate (End)" }
      ];
  const expandWithMeta = (rows, nameKey, metaMap, sortMetric) => {
    const duplicateByPack = sortMetric === "pack";
    const result = [];
    for (const row of rows) {
      const name = row[nameKey];
      const meta = metaMap.get(name) || {};
      const tier = Number.isFinite(Number(meta?.tier)) ? Number(meta.tier) : null;
      const rawPacks = Array.isArray(meta?.packs) && meta.packs.length ? meta.packs : ["Unassigned"];
      const selectedPacks = itemPackFilter ? rawPacks.filter((packName) => packName === itemPackFilter) : rawPacks;
      if (!selectedPacks.length) continue;

      if (duplicateByPack) {
        for (const packName of selectedPacks) {
          result.push({ ...row, _tier: tier, _pack: packName });
        }
      } else {
        result.push({ ...row, _tier: tier, _pack: selectedPacks[0] });
      }
    }
    return result;
  };

  const compareRows = (a, b, sortMetric, order, totalGamesValue, nameKey) => {
    const direction = order === "desc" ? -1 : 1;
    const games = Number(totalGamesValue || 0);

    const calcMetric = (row) => {
      const gamesWith = Number(row.games_with || 0);
      const winsWith = Number(row.wins_with || 0);
      const drawsWith = Number(row.draws_with || 0);
      const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
      const gamesEnd = Number(row.games_end || 0);
      const winsEnd = Number(row.wins_end || 0);
      const drawsEnd = Number(row.draws_end || 0);
      const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);

      switch (sortMetric) {
        case "name":
          return row[nameKey];
        case "pack":
          return packOrderMap[row._pack] ?? 999;
        case "tier":
          return row._tier ?? 999;
        case "count":
          return gamesWith;
        case "winrate":
          return gamesWith ? winsWith / gamesWith : 0;
        case "lossrate":
          return gamesWith ? lossesWith / gamesWith : 0;
        case "drawrate":
          return gamesWith ? drawsWith / gamesWith : 0;
        case "buyCount":
          return gamesWith;
        case "presence":
        case "pickrate":
          return games ? gamesWith / games : 0;
        case "buyWinrate":
          return gamesWith ? winsWith / gamesWith : 0;
        case "buyLossrate":
          return gamesWith ? lossesWith / gamesWith : 0;
        case "endCount":
          return gamesEnd;
        case "endRate":
          return games ? gamesEnd / games : 0;
        case "endWinrate":
          return gamesEnd ? winsEnd / gamesEnd : 0;
        case "endLossrate":
          return gamesEnd ? lossesEnd / gamesEnd : 0;
        default:
          return row[nameKey];
      }
    };

    const av = calcMetric(a);
    const bv = calcMetric(b);

    let metricCompare = 0;
    if (typeof av === "string" || typeof bv === "string") {
      metricCompare = direction * String(av).localeCompare(String(bv));
    } else {
      metricCompare = direction * (Number(av) - Number(bv));
    }
    if (metricCompare !== 0) return metricCompare;

    if (sortMetric === "pack") {
      const tierA = Number.isFinite(Number(a._tier)) ? Number(a._tier) : Number.POSITIVE_INFINITY;
      const tierB = Number.isFinite(Number(b._tier)) ? Number(b._tier) : Number.POSITIVE_INFINITY;
      if (tierA !== tierB) return tierA - tierB;
    }

    if (sortMetric !== "pack") {
      const packCompare = (packOrderMap[a._pack] ?? 999) - (packOrderMap[b._pack] ?? 999);
      if (packCompare !== 0) return packCompare;
    }
    return String(a[nameKey] || "").localeCompare(String(b[nameKey] || ""));
  };

  const sortedPackStats = useMemo(() => {
    return [...stats.packStats].sort((a, b) => {
      const av = packOrderMap[a.pack] ?? 999;
      const bv = packOrderMap[b.pack] ?? 999;
      if (av !== bv) return av - bv;
      return String(a.pack || "").localeCompare(String(b.pack || ""));
    });
  }, [stats.packStats]);
  const sortedMatchupStats = useMemo(() => {
    return [...(stats.matchupStats || [])].sort((a, b) => {
      const gameDiff = Number(b.games || 0) - Number(a.games || 0);
      if (gameDiff !== 0) return gameDiff;

      const aRateGames = Number(a.rate_games || 0);
      const bRateGames = Number(b.rate_games || 0);
      const aGames = Number(a.games || 0);
      const bGames = Number(b.games || 0);
      const aWins = Number(a.wins || 0);
      const bWins = Number(b.wins || 0);
      const aWinrate = aRateGames ? Number(a.rate_wins || 0) / aRateGames : (aGames ? aWins / aGames : 0);
      const bWinrate = bRateGames ? Number(b.rate_wins || 0) / bRateGames : (bGames ? bWins / bGames : 0);
      if (bWinrate !== aWinrate) return bWinrate - aWinrate;

      const packDiff = (packOrderMap[a.pack] ?? 999) - (packOrderMap[b.pack] ?? 999);
      if (packDiff !== 0) return packDiff;

      const opponentPackDiff = (packOrderMap[a.opponent_pack] ?? 999) - (packOrderMap[b.opponent_pack] ?? 999);
      if (opponentPackDiff !== 0) return opponentPackDiff;

      const packNameDiff = String(a.pack || "").localeCompare(String(b.pack || ""));
      if (packNameDiff !== 0) return packNameDiff;

      return String(a.opponent_pack || "").localeCompare(String(b.opponent_pack || ""));
    });
  }, [stats.matchupStats]);
  const sortedPetStats = useMemo(() => {
    return expandWithMeta(stats.petStats, "pet_name", petMetaMap, petSort).sort((a, b) =>
      compareRows(a, b, petSort, petOrder, stats.totalGames, "pet_name")
    );
  }, [stats.petStats, stats.totalGames, petSort, petOrder, petMetaMap, itemPackFilter]);
  const sortedPerkStats = useMemo(() => {
    return expandWithMeta(stats.perkStats, "perk_name", perkMetaMap, perkSort).sort((a, b) =>
      compareRows(a, b, perkSort, perkOrder, stats.totalGames, "perk_name")
    );
  }, [stats.perkStats, stats.totalGames, perkSort, perkOrder, perkMetaMap, itemPackFilter]);
  const sortedToyStats = useMemo(() => {
    return expandWithMeta(stats.toyStats, "toy_name", toyMetaMap, toySort).sort((a, b) =>
      compareRows(a, b, toySort, toyOrder, stats.totalGames, "toy_name")
    );
  }, [stats.toyStats, stats.totalGames, toySort, toyOrder, toyMetaMap, itemPackFilter]);
  const totalPetCount = useMemo(
    () => (stats.petStats || []).reduce((sum, row) => sum + Number(row.games_with || 0), 0),
    [stats.petStats]
  );
  const totalPerkCount = useMemo(
    () => (stats.perkStats || []).reduce((sum, row) => sum + Number(row.games_with || 0), 0),
    [stats.perkStats]
  );
  const totalToyCount = useMemo(
    () => (stats.toyStats || []).reduce((sum, row) => sum + Number(row.games_with || 0), 0),
    [stats.toyStats]
  );
  const totalPackEntries = useMemo(
    () => sortedPackStats.reduce((sum, row) => sum + Number(row.games || 0), 0),
    [sortedPackStats]
  );
  const statsCardsClass = `stats-cards${viewMode === "list" ? " list-view" : ""}`;
  const generatedAtLabel = stats.generatedAt ? new Date(stats.generatedAt).toLocaleString() : "-";
  const newestEntryLabel = stats.newestEntryAt ? new Date(stats.newestEntryAt).toLocaleString() : "-";

  return (
    <main onClick={() => setSortMenuOpen({ pet: false, perk: false, toy: false })}>
      <header className="hero">
        <div className="hero-copy">
          <h1>Stats Lab</h1>
          <p>Winrates by pack, pet buy rates, and end-board impact. Excludes Custom, Weekly, and Arena games.</p>
        </div>
        <nav className="top-nav">
          <Link href="/" className="nav-link">Explorer</Link>
          <Link href="/stats" className="nav-link active">Stats</Link>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
          <Link href="/profile" className="nav-link">Profile</Link>
        </nav>
      </header>

      <section className="section filters-section">
        <div className="section-head">
          <h2>Filters</h2>
          <div className="section-actions">
            <button className="ghost" type="button" onClick={copyShareLink}>Copy Link</button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                const reset = { ...DEFAULT_STATS_FILTERS };
                setFilters(reset);
                setPetSort(defaultSortForScope(reset.scope));
                setPetOrder("desc");
                setPerkSort(defaultSortForScope(reset.scope));
                setPerkOrder("desc");
                setToySort(defaultSortForScope(reset.scope));
                setToyOrder("desc");
                loadStats(reset, {
                  uiState: {
                    viewModeValue: viewMode,
                    petSortValue: defaultSortForScope(reset.scope),
                    petOrderValue: "desc",
                    perkSortValue: defaultSortForScope(reset.scope),
                    perkOrderValue: "desc",
                    toySortValue: defaultSortForScope(reset.scope),
                    toyOrderValue: "desc"
                  }
                });
              }}
            >
              Reset
            </button>
            <button className="secondary" type="button" onClick={() => loadStats(filters)}>Apply</button>
          </div>
        </div>
        {shareStatus ? <div className="status">{shareStatus}</div> : null}
        <div className="filters">
          <div className="field">
            <label>Player Name</label>
            <input
              placeholder="Any player"
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
            <label>Version</label>
            <select
              value={filters.version}
              onChange={(e) => setFilters({ ...filters, version: e.target.value })}
            >
              <option value="current">
                Current
                {meta.currentVersion ? ` (${meta.currentVersion})` : ""}
              </option>
              <option value="all">All Versions</option>
              {(meta.versions || []).map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Scope</label>
            <select
              value={filters.scope}
              onChange={(e) => {
                const nextScope = e.target.value;
                const next = { ...filters, scope: nextScope };
                const nextPetSort = defaultSortForScope(nextScope);
                const nextPerkSort = defaultSortForScope(nextScope);
                const nextToySort = defaultSortForScope(nextScope);
                setFilters(next);
                setPetSort(nextPetSort);
                setPerkSort(nextPerkSort);
                setToySort(nextToySort);
                setPetOrder("desc");
                setPerkOrder("desc");
                setToyOrder("desc");
                loadStats(next, {
                  uiState: {
                    viewModeValue: viewMode,
                    petSortValue: nextPetSort,
                    petOrderValue: "desc",
                    perkSortValue: nextPerkSort,
                    perkOrderValue: "desc",
                    toySortValue: nextToySort,
                    toyOrderValue: "desc"
                  }
                });
              }}
            >
              <option value="game">Per Game</option>
              <option value="battle">Per Battle</option>
            </select>
          </div>
          <div className="field">
            <label>Player Pack</label>
            <select value={filters.pack} onChange={(e) => setFilters({ ...filters, pack: e.target.value })}>
              <option value="">Any</option>
              {packOptions.map((pack) => (
                <option key={pack.id} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Opponent Pack</label>
            <select value={filters.opponentPack} onChange={(e) => setFilters({ ...filters, opponentPack: e.target.value })}>
              <option value="">Any</option>
              {packOptions.map((pack) => (
                <option key={pack.id} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Winning Pack</label>
            <select value={filters.winningPack} onChange={(e) => setFilters({ ...filters, winningPack: e.target.value })}>
              <option value="">Any</option>
              {packOptions.map((pack) => (
                <option key={`stats-win-${pack.id}`} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Losing Pack</label>
            <select value={filters.losingPack} onChange={(e) => setFilters({ ...filters, losingPack: e.target.value })}>
              <option value="">Any</option>
              {packOptions.map((pack) => (
                <option key={`stats-lose-${pack.id}`} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Exclude Pack</label>
            <select value={filters.excludePack} onChange={(e) => setFilters({ ...filters, excludePack: e.target.value })}>
              <option value="">None</option>
              {packOptions.map((pack) => (
                <option key={`exclude-${pack.id}`} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Exclude Mirrors</label>
            <select
              value={filters.excludeMirrors ? "yes" : "no"}
              onChange={(e) => setFilters({ ...filters, excludeMirrors: e.target.value === "yes" })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label>Min Sample Size</label>
            <input
              type="number"
              min="0"
              placeholder="10"
              value={filters.minSample}
              onChange={(e) => setFilters({ ...filters, minSample: e.target.value })}
            />
          </div>
          {filters.scope === "game" && (
            <div className="field">
              <label>Min End On #</label>
              <input
                type="number"
                min="0"
                placeholder="Any"
                value={filters.minEndOn}
                onChange={(e) => setFilters({ ...filters, minEndOn: e.target.value })}
              />
            </div>
          )}
          <div className="field">
            <label>Min Elo</label>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={filters.minElo}
              onChange={(e) => setFilters({ ...filters, minElo: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Max Elo</label>
            <input
              type="number"
              min="0"
              placeholder="Any"
              value={filters.maxElo}
              onChange={(e) => setFilters({ ...filters, maxElo: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Item Pack Group</label>
            <select value={filters.itemPack} onChange={(e) => setFilters({ ...filters, itemPack: e.target.value })}>
              <option value="">All Packs</option>
              {packOptions.map((pack) => (
                <option key={`item-pack-${pack.id}`} value={pack.name}>{pack.name}</option>
              ))}
            </select>
          </div>
          {filters.scope === "battle" && (
            <>
              <div className="field">
                <label>
                  <span className="multi-label-with-icon">
                    <img src={turnFilterSprite} alt="" className="multi-label-icon" />
                    <span>Min Turn</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={filters.minTurn}
                  onChange={(e) => setFilters({ ...filters, minTurn: e.target.value })}
                />
              </div>
              <div className="field">
                <label>
                  <span className="multi-label-with-icon">
                    <img src={turnFilterSprite} alt="" className="multi-label-icon" />
                    <span>Max Turn</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="15"
                  value={filters.maxTurn}
                  onChange={(e) => setFilters({ ...filters, maxTurn: e.target.value })}
                />
              </div>
            </>
          )}
          <div className="field">
            <label>Pet Level</label>
            <select value={filters.petLevel} onChange={(e) => setFilters({ ...filters, petLevel: e.target.value })}>
              <option value="">Any</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </div>
        <details className="advanced-panel">
          <summary>Advanced</summary>
          <p className="advanced-note">Filter by board presence for each side. Matches any battle in a game.</p>
          <div className="filters advanced-filters">
            <IconMultiSelect
              label="Your Side Pet"
              options={petOptions}
              selected={filters.allyPet}
              onChange={(value) => setFilters({ ...filters, allyPet: value })}
              placeholder="Search pets and add"
            />
            <IconMultiSelect
              label="Opponent Pet"
              options={petOptions}
              selected={filters.opponentPet}
              onChange={(value) => setFilters({ ...filters, opponentPet: value })}
              placeholder="Search pets and add"
            />
            <IconMultiSelect
              label="Your Side Perk"
              options={perkOptions}
              selected={filters.allyPerk}
              onChange={(value) => setFilters({ ...filters, allyPerk: value })}
              placeholder="Search perks and add"
            />
            <IconMultiSelect
              label="Opponent Perk"
              options={perkOptions}
              selected={filters.opponentPerk}
              onChange={(value) => setFilters({ ...filters, opponentPerk: value })}
              placeholder="Search perks and add"
            />
            <IconMultiSelect
              label="Your Side Toy"
              options={toyOptions}
              selected={filters.allyToy}
              onChange={(value) => setFilters({ ...filters, allyToy: value })}
              placeholder="Search toys and add"
            />
            <IconMultiSelect
              label="Opponent Toy"
              options={toyOptions}
              selected={filters.opponentToy}
              onChange={(value) => setFilters({ ...filters, opponentToy: value })}
              placeholder="Search toys and add"
            />
            <div className="field">
              <label>Tags (comma)</label>
              <input
                placeholder="tournament, week1"
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
              />
            </div>
          </div>
        </details>
      </section>


      <section className="section">
        <div className="results-header">
          <h2>Summary</h2>
          <div className="results-actions">
            <div className="status">
              {loading ? "Loading..." : `${stats.totalGames} ${filters.scope === "battle" ? "rounds" : "games"}`}
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={`toggle${viewMode === "card" ? " active" : ""}`}
                onClick={() => setViewMode("card")}
              >
                Cards
              </button>
              <button
                type="button"
                className={`toggle${viewMode === "list" ? " active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
          </div>
        </div>
        <div className="stats-summary-grid">
          <div className="stats-summary-item">
            <span className="label">Total Games</span>
            <strong>{Number(stats.totalGames || 0)}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Total Battles</span>
            <strong>{Number(stats.totalBattles || 0)}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Total Pets</span>
            <strong>{totalPetCount}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Total Perks</span>
            <strong>{totalPerkCount}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Total Toys</span>
            <strong>{totalToyCount}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Last Refresh</span>
            <strong>{generatedAtLabel}</strong>
          </div>
          <div className="stats-summary-item">
            <span className="label">Data Through</span>
            <strong>{newestEntryLabel}</strong>
          </div>
        </div>
        {!loading && stats.totalGames === 0 && (
          <div className="empty-state">No games match the current filters.</div>
        )}
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Pack Stats</h2>
          <div className="results-actions">
            <button type="button" className="ghost" onClick={() => toggleCollapsed("pack")}>
              {collapsed.pack ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!collapsed.pack && (
        <div className={statsCardsClass}>
          {sortedPackStats.map((row) => {
            const games = Number(row.games || 0);
            const wins = Number(row.wins || 0);
            const draws = Number(row.draws || 0);
            const avgGameLength = Number(row.avg_game_length || 0);
            const rateGames = Number(row.rate_games ?? games);
            const rateWins = Number(row.rate_wins ?? wins);
            const rateDraws = Number(row.rate_draws ?? draws);
            const rateLosses = Math.max(0, rateGames - rateWins - rateDraws);
            const avgRankValue = Number(row.avg_rank);
            const avgRankLabel =
              Number.isFinite(avgRankValue) && avgRankValue > 0 ? avgRankValue.toFixed(1) : "-";
            return (
              <div className="stats-card" key={row.pack}>
                <div className="stats-card-head">
                  {packSprite(row.pack) ? (
                    <img src={packSprite(row.pack)} alt="" />
                  ) : null}
                  <h4>{row.pack}</h4>
                </div>
                <div className="stats-card-meta">
                  <span>{filters.scope === "battle" ? "Rounds" : "Games"}: {games}</span>
                </div>
                <div className="stats-card-metrics">
                  <div>Pack Share: {formatPct(totalPackEntries ? games / totalPackEntries : 0)}</div>
                  <div>Avg Game Length: {formatTurns(avgGameLength)} turns</div>
                  <div className="rate-win">Winrate (No Mirrors): {formatPct(rateGames ? rateWins / rateGames : 0)}</div>
                  <div className="rate-loss">Lossrate (No Mirrors): {formatPct(rateGames ? rateLosses / rateGames : 0)}</div>
                  <div>Avg Rank (non-private): {avgRankLabel}</div>
                  {filters.scope === "battle" ? (
                    <div>Drawrate (No Mirrors): {formatPct(rateGames ? rateDraws / rateGames : 0)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {stats.packStats.length === 0 && !loading && (
            <div className="stats-card empty">No pack stats yet.</div>
          )}
        </div>
        )}
      </section>

      <section className="section">
        <div className="results-header with-inline-filter">
          <h2>Pet Stats</h2>
          <div className="section-inline-filter">
            <IconMultiSelect
              label={(
                <span className="multi-label-with-icon">
                  <img src={petFilterSprite} alt="" className="multi-label-icon" />
                  <span>Pet Search</span>
                </span>
              )}
              options={petOptions}
              selected={filters.pet}
              onChange={(value) => {
                const next = { ...filters, pet: value };
                setFilters(next);
                loadStats(next);
              }}
              placeholder="Search pets..."
            />
          </div>
          <div className="sort-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-button"
              aria-label="Sort pet stats"
              onClick={() => setSortMenuOpen((prev) => ({ pet: !prev.pet, perk: false, toy: false }))}
            >
              Sort
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h10M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {sortMenuOpen.pet && (
              <div className="sort-panel" onClick={(e) => e.stopPropagation()}>
                <div className="field">
                  <label>Sort</label>
                  <select
                    value={petSort}
                    onChange={(e) => {
                      const nextSort = e.target.value;
                      setPetSort(nextSort);
                      if (nextSort === "pack") {
                        setPetOrder("asc");
                      }
                    }}
                  >
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={petOrder} onChange={(e) => setPetOrder(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="results-actions">
            <button type="button" className="ghost" onClick={() => toggleCollapsed("pet")}>
              {collapsed.pet ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!collapsed.pet && (
        <div className={statsCardsClass}>
          {sortedPetStats.map((row) => {
            const games = Number(stats.totalGames || 0);
            const gamesWith = Number(row.games_with || 0);
            const winsWith = Number(row.wins_with || 0);
            const gamesEnd = Number(row.games_end || 0);
            const winsEnd = Number(row.wins_end || 0);
            const drawsWith = Number(row.draws_with || 0);
            const drawsEnd = Number(row.draws_end || 0);
            const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
            const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
            return (
              <div className="stats-card" key={`${row.pet_name}-${row._pack || "all"}`}>
                <div className="stats-card-head">
                  {petSprite(row.pet_name) ? (
                    <img src={petSprite(row.pet_name)} alt="" />
                  ) : null}
                  <h4>{row.pet_name}</h4>
                </div>
                <div className="stats-card-meta">
                  <span>Tier: {row._tier ?? "?"}</span>
                  <span>Pack: {row._pack || "Unassigned"}</span>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div className="rate-win">Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>{appearanceLabel}: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div className="rate-win">Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div className="rate-win">Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div className="rate-loss">Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {stats.petStats.length === 0 && !loading && (
            <div className="stats-card empty">No pet stats yet.</div>
          )}
        </div>
        )}
      </section>

      <section className="section">
        <div className="results-header with-inline-filter">
          <h2>Perk Stats</h2>
          <div className="section-inline-filter">
            <IconMultiSelect
              label={(
                <span className="multi-label-with-icon">
                  <img src={perkFilterSprite} alt="" className="multi-label-icon" />
                  <span>Perk Search</span>
                </span>
              )}
              options={perkOptions}
              selected={filters.perk}
              onChange={(value) => {
                const next = { ...filters, perk: value };
                setFilters(next);
                loadStats(next);
              }}
              placeholder="Search perks and add"
            />
          </div>
          <div className="sort-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-button"
              aria-label="Sort perk stats"
              onClick={() => setSortMenuOpen((prev) => ({ pet: false, perk: !prev.perk, toy: false }))}
            >
              Sort
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h10M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {sortMenuOpen.perk && (
              <div className="sort-panel" onClick={(e) => e.stopPropagation()}>
                <div className="field">
                  <label>Sort</label>
                  <select
                    value={perkSort}
                    onChange={(e) => {
                      const nextSort = e.target.value;
                      setPerkSort(nextSort);
                      if (nextSort === "pack") {
                        setPerkOrder("asc");
                      }
                    }}
                  >
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={perkOrder} onChange={(e) => setPerkOrder(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="results-actions">
            <button type="button" className="ghost" onClick={() => toggleCollapsed("perk")}>
              {collapsed.perk ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!collapsed.perk && (
        <div className={statsCardsClass}>
          {sortedPerkStats.map((row) => {
            const games = Number(stats.totalGames || 0);
            const gamesWith = Number(row.games_with || 0);
            const winsWith = Number(row.wins_with || 0);
            const gamesEnd = Number(row.games_end || 0);
            const winsEnd = Number(row.wins_end || 0);
            const drawsWith = Number(row.draws_with || 0);
            const drawsEnd = Number(row.draws_end || 0);
            const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
            const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
            return (
              <div className="stats-card" key={`perk-${row.perk_name}-${row._pack || "all"}`}>
                <div className="stats-card-head">
                  {perkSprite(row.perk_name) ? (
                    <img src={perkSprite(row.perk_name)} alt="" />
                  ) : null}
                  <h4>{row.perk_name}</h4>
                </div>
                <div className="stats-card-meta">
                  <span>Tier: {row._tier ?? "?"}</span>
                  <span>Pack: {row._pack || "Unassigned"}</span>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div className="rate-win">Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>{appearanceLabel}: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div className="rate-win">Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div className="rate-win">Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div className="rate-loss">Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {stats.perkStats.length === 0 && !loading && (
            <div className="stats-card empty">No perk stats yet.</div>
          )}
        </div>
        )}
      </section>

      <section className="section">
        <div className="results-header with-inline-filter">
          <h2>Toy Stats</h2>
          <div className="section-inline-filter">
            <IconMultiSelect
              label={(
                <span className="multi-label-with-icon">
                  <img src={toyFilterSprite} alt="" className="multi-label-icon" />
                  <span>Toy Search</span>
                </span>
              )}
              options={toyOptions}
              selected={filters.toy}
              onChange={(value) => {
                const next = { ...filters, toy: value };
                setFilters(next);
                loadStats(next);
              }}
              placeholder="Search toys and add"
            />
          </div>
          <div className="sort-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-button"
              aria-label="Sort toy stats"
              onClick={() => setSortMenuOpen((prev) => ({ pet: false, perk: false, toy: !prev.toy }))}
            >
              Sort
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h10M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {sortMenuOpen.toy && (
              <div className="sort-panel" onClick={(e) => e.stopPropagation()}>
                <div className="field">
                  <label>Sort</label>
                  <select
                    value={toySort}
                    onChange={(e) => {
                      const nextSort = e.target.value;
                      setToySort(nextSort);
                      if (nextSort === "pack") {
                        setToyOrder("asc");
                      }
                    }}
                  >
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={toyOrder} onChange={(e) => setToyOrder(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="results-actions">
            <button type="button" className="ghost" onClick={() => toggleCollapsed("toy")}>
              {collapsed.toy ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!collapsed.toy && (
        <div className={statsCardsClass}>
          {sortedToyStats.map((row) => {
            const games = Number(stats.totalGames || 0);
            const gamesWith = Number(row.games_with || 0);
            const winsWith = Number(row.wins_with || 0);
            const gamesEnd = Number(row.games_end || 0);
            const winsEnd = Number(row.wins_end || 0);
            const drawsWith = Number(row.draws_with || 0);
            const drawsEnd = Number(row.draws_end || 0);
            const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
            const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
            return (
              <div className="stats-card" key={`toy-${row.toy_name}-${row._pack || "all"}`}>
                <div className="stats-card-head">
                  {toySprite(row.toy_name) ? (
                    <img src={toySprite(row.toy_name)} alt="" />
                  ) : null}
                  <h4>{row.toy_name}</h4>
                </div>
                <div className="stats-card-meta">
                  <span>Tier: {row._tier ?? "?"}</span>
                  <span>Pack: {row._pack || "Unassigned"}</span>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div className="rate-win">Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>{appearanceLabel}: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div className="rate-win">Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div className="rate-loss">Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div className="rate-win">Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div className="rate-loss">Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {stats.toyStats.length === 0 && !loading && (
            <div className="stats-card empty">No toy stats yet.</div>
          )}
        </div>
        )}
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Matchup Stats</h2>
          <div className="results-actions">
            <button type="button" className="ghost" onClick={() => toggleCollapsed("matchup")}>
              {collapsed.matchup ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!collapsed.matchup && (
        <div className={statsCardsClass}>
          {sortedMatchupStats.map((row) => {
            const games = Number(row.games || 0);
            const wins = Number(row.wins || 0);
            const draws = Number(row.draws || 0);
            const avgGameLength = Number(row.avg_game_length || 0);
            const rateGames = Number(row.rate_games ?? games);
            const rateWins = Number(row.rate_wins ?? wins);
            const rateDraws = Number(row.rate_draws ?? draws);
            const hasNoMirrorSample = rateGames > 0;
            const effectiveGames = hasNoMirrorSample ? rateGames : games;
            const effectiveWins = hasNoMirrorSample ? rateWins : wins;
            const effectiveDraws = hasNoMirrorSample ? rateDraws : draws;
            const effectiveLosses = Math.max(0, effectiveGames - effectiveWins - effectiveDraws);
            const rateLabel = hasNoMirrorSample ? " (No Mirrors)" : "";
            return (
              <div className="stats-card" key={`${row.pack}-${row.opponent_pack}`}>
                <div className="stats-card-head">
                  <PackMatchupInline
                    pack={row.pack}
                    opponentPack={row.opponent_pack}
                    className="pack-matchup-inline stats-card-pack-inline"
                  />
                </div>
                <div className="stats-card-meta">
                  <span>{filters.scope === "battle" ? "Rounds" : "Games"}: {games}</span>
                </div>
                <div className="stats-card-metrics">
                  <div>Avg Turn Length: {formatTurns(avgGameLength)} turns</div>
                  <div className="rate-win">Winrate{rateLabel}: {formatPct(effectiveGames ? effectiveWins / effectiveGames : 0)}</div>
                  <div className="rate-loss">Lossrate{rateLabel}: {formatPct(effectiveGames ? effectiveLosses / effectiveGames : 0)}</div>
                  {filters.scope === "battle" ? (
                    <div>Drawrate{rateLabel}: {formatPct(effectiveGames ? effectiveDraws / effectiveGames : 0)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {stats.matchupStats.length === 0 && !loading && (
            <div className="stats-card empty">No matchup stats yet.</div>
          )}
        </div>
        )}
      </section>
    </main>
  );
}
