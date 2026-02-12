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

const EXCLUDED_PACKS = ["Custom", "Weekly"];

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
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${(value * 100).toFixed(1)}%`;
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

export default function StatsPage() {
  const [meta, setMeta] = useState({ pets: [], perks: [], toys: [], packs: [] });
  const [filters, setFilters] = useState({
    scope: "game",
    pack: "",
    opponentPack: "",
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
  });
  const [stats, setStats] = useState({
    totalGames: 0,
    packStats: [],
    petStats: [],
    perkStats: [],
    toyStats: []
  });
  const [loading, setLoading] = useState(false);
  const [petSort, setPetSort] = useState("name");
  const [petOrder, setPetOrder] = useState("asc");
  const [perkSort, setPerkSort] = useState("name");
  const [perkOrder, setPerkOrder] = useState("asc");
  const [toySort, setToySort] = useState("name");
  const [toyOrder, setToyOrder] = useState("asc");
  const [viewMode, setViewMode] = useState("card");
  const [sortMenuOpen, setSortMenuOpen] = useState({
    pet: false,
    perk: false,
    toy: false
  });

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

  const packOptions = useMemo(() => meta.packs.filter((pack) => !EXCLUDED_PACKS.includes(pack.name)), [meta.packs]);
  const petOptions = useMemo(() => meta.pets, [meta.pets]);
  const perkOptions = useMemo(() => meta.perks, [meta.perks]);
  const toyOptions = useMemo(() => meta.toys, [meta.toys]);

  async function loadStats(nextFilters = filters) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextFilters.scope) params.set("scope", nextFilters.scope);
      if (nextFilters.pack) params.set("pack", nextFilters.pack);
      if (nextFilters.opponentPack) params.set("opponentPack", nextFilters.opponentPack);
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
      const res = await fetch(`/api/stats?${params.toString()}`);
      const data = await res.json();
      setStats({
        totalGames: data.totalGames || 0,
        packStats: data.packStats || [],
        petStats: data.petStats || [],
        perkStats: data.perkStats || [],
        toyStats: data.toyStats || []
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats(filters);
  }, [filters.scope]);

  const petSprite = (name) => petOptions.find((pet) => pet.name === name)?.sprite;
  const perkSprite = (name) => perkOptions.find((perk) => perk.name === name)?.sprite;
  const toySprite = (name) => toyOptions.find((toy) => toy.name === name)?.sprite;
  const packSprite = (name) => {
    const map = {
      Turtle: "/Sprite/Pets/Turtle.png",
      Puppy: "/Sprite/Pets/Puppy.png",
      Star: "/Sprite/Pets/Starfish.png",
      Golden: "/Sprite/Pets/GoldenRetriever.png",
      Unicorn: "/Sprite/Pets/Unicorn.png",
      Danger: "/Sprite/Pets/BlueWhale.png"
    };
    return map[name] || null;
  };
  const packOrderMap = {
    Turtle: 0,
    Puppy: 1,
    Star: 2,
    Custom: 3,
    Weekly: 4,
    Golden: 5,
    Unicorn: 6,
    Danger: 7
  };
  const itemSortOptions = filters.scope === "battle"
    ? [
        { value: "name", label: "Name" },
        { value: "count", label: "Rounds" },
        { value: "winrate", label: "Winrate" },
        { value: "lossrate", label: "Lossrate" },
        { value: "drawrate", label: "Drawrate" }
      ]
    : [
        { value: "name", label: "Name" },
        { value: "buyCount", label: "Buy Count" },
        { value: "pickrate", label: "Pickrate" },
        { value: "buyWinrate", label: "Winrate (Buy)" },
        { value: "buyLossrate", label: "Lossrate (Buy)" },
        { value: "endCount", label: "End Count" },
        { value: "endRate", label: "End Rate" },
        { value: "endWinrate", label: "Winrate (End)" },
        { value: "endLossrate", label: "Lossrate (End)" }
      ];
  const sortRows = (rows, getValue, order) => {
    const direction = order === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" || typeof bv === "string") {
        return direction * String(av).localeCompare(String(bv));
      }
      return direction * (Number(av) - Number(bv));
    });
  };
  const sortedPackStats = useMemo(() => {
    return [...stats.packStats].sort((a, b) => {
      const av = packOrderMap[a.pack] ?? 999;
      const bv = packOrderMap[b.pack] ?? 999;
      if (av !== bv) return av - bv;
      return String(a.pack || "").localeCompare(String(b.pack || ""));
    });
  }, [stats.packStats]);
  const sortedPetStats = useMemo(() => {
    return sortRows(stats.petStats, (row) => {
      const games = Number(stats.totalGames || 0);
      const gamesWith = Number(row.games_with || 0);
      const winsWith = Number(row.wins_with || 0);
      const drawsWith = Number(row.draws_with || 0);
      const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
      const gamesEnd = Number(row.games_end || 0);
      const winsEnd = Number(row.wins_end || 0);
      const drawsEnd = Number(row.draws_end || 0);
      const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
      switch (petSort) {
        case "name":
          return row.pet_name;
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
          return row.pet_name;
      }
    }, petOrder);
  }, [stats.petStats, stats.totalGames, petSort, petOrder]);
  const sortedPerkStats = useMemo(() => {
    return sortRows(stats.perkStats, (row) => {
      const games = Number(stats.totalGames || 0);
      const gamesWith = Number(row.games_with || 0);
      const winsWith = Number(row.wins_with || 0);
      const drawsWith = Number(row.draws_with || 0);
      const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
      const gamesEnd = Number(row.games_end || 0);
      const winsEnd = Number(row.wins_end || 0);
      const drawsEnd = Number(row.draws_end || 0);
      const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
      switch (perkSort) {
        case "name":
          return row.perk_name;
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
          return row.perk_name;
      }
    }, perkOrder);
  }, [stats.perkStats, stats.totalGames, perkSort, perkOrder]);
  const sortedToyStats = useMemo(() => {
    return sortRows(stats.toyStats, (row) => {
      const games = Number(stats.totalGames || 0);
      const gamesWith = Number(row.games_with || 0);
      const winsWith = Number(row.wins_with || 0);
      const drawsWith = Number(row.draws_with || 0);
      const lossesWith = Math.max(0, gamesWith - winsWith - drawsWith);
      const gamesEnd = Number(row.games_end || 0);
      const winsEnd = Number(row.wins_end || 0);
      const drawsEnd = Number(row.draws_end || 0);
      const lossesEnd = Math.max(0, gamesEnd - winsEnd - drawsEnd);
      switch (toySort) {
        case "name":
          return row.toy_name;
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
          return row.toy_name;
      }
    }, toyOrder);
  }, [stats.toyStats, stats.totalGames, toySort, toyOrder]);
  const statsCardsClass = `stats-cards${viewMode === "list" ? " list-view" : ""}`;

  return (
    <main onClick={() => setSortMenuOpen({ pet: false, perk: false, toy: false })}>
      <div className="top-nav">
        <Link href="/" className="nav-link">Explorer</Link>
        <Link href="/stats" className="nav-link active">Stats</Link>
      </div>

      <header className="hero">
        <div className="hero-copy">
          <h1>Stats Lab</h1>
          <p>Winrates by pack, pet buy rates, and end-board impact. Excludes Custom, Weekly, and Arena games.</p>
        </div>
      </header>

      <section className="section filters-section">
        <div className="section-head">
          <h2>Filters</h2>
          <div className="section-actions">
            <button
              className="ghost"
              type="button"
              onClick={() => {
                const reset = {
                  scope: "game",
                  pack: "",
                  opponentPack: "",
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
                setFilters(reset);
                loadStats(reset);
              }}
            >
              Reset
            </button>
            <button className="secondary" type="button" onClick={() => loadStats(filters)}>Apply</button>
          </div>
        </div>
        <div className="filters">
          <div className="field">
            <label>Scope</label>
            <select
              value={filters.scope}
              onChange={(e) => setFilters({ ...filters, scope: e.target.value })}
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
          <IconMultiSelect
            label="Pet"
            options={petOptions}
            selected={filters.pet}
            onChange={(value) => setFilters({ ...filters, pet: value })}
            placeholder="Search pets and add"
          />
          <div className="field">
            <label>Pet Level</label>
            <select value={filters.petLevel} onChange={(e) => setFilters({ ...filters, petLevel: e.target.value })}>
              <option value="">Any</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <IconMultiSelect
            label="Perk"
            options={perkOptions}
            selected={filters.perk}
            onChange={(value) => setFilters({ ...filters, perk: value })}
            placeholder="Search perks and add"
          />
          <IconMultiSelect
            label="Toy"
            options={toyOptions}
            selected={filters.toy}
            onChange={(value) => setFilters({ ...filters, toy: value })}
            placeholder="Search toys and add"
          />
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
        {!loading && stats.totalGames === 0 && (
          <div className="empty-state">No games match the current filters.</div>
        )}
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Pack Winrates</h2>
        </div>
        <div className={statsCardsClass}>
          {sortedPackStats.map((row) => {
            const games = Number(row.games || 0);
            const wins = Number(row.wins || 0);
            const draws = Number(row.draws || 0);
            const losses = Math.max(0, games - wins - draws);
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
                  <div>Winrate: {formatPct(games ? wins / games : 0)}</div>
                  <div>Lossrate: {formatPct(games ? losses / games : 0)}</div>
                  {filters.scope === "battle" ? (
                    <div>Drawrate: {formatPct(games ? draws / games : 0)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {stats.packStats.length === 0 && !loading && (
            <div className="stats-card empty">No pack stats yet.</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Pet Impact</h2>
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
                  <select value={petSort} onChange={(e) => setPetSort(e.target.value)}>
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={petOrder} onChange={(e) => setPetOrder(e.target.value)}>
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
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
              <div className="stats-card" key={row.pet_name}>
                <div className="stats-card-head">
                  {petSprite(row.pet_name) ? (
                    <img src={petSprite(row.pet_name)} alt="" />
                  ) : null}
                  <h4>{row.pet_name}</h4>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Pickrate: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div>Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div>Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div>Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
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
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Perk Impact</h2>
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
                  <select value={perkSort} onChange={(e) => setPerkSort(e.target.value)}>
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={perkOrder} onChange={(e) => setPerkOrder(e.target.value)}>
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
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
              <div className="stats-card" key={`perk-${row.perk_name}`}>
                <div className="stats-card-head">
                  {perkSprite(row.perk_name) ? (
                    <img src={perkSprite(row.perk_name)} alt="" />
                  ) : null}
                  <h4>{row.perk_name}</h4>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Pickrate: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div>Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div>Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div>Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
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
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Toy Impact</h2>
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
                  <select value={toySort} onChange={(e) => setToySort(e.target.value)}>
                    {itemSortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Order</label>
                  <select value={toyOrder} onChange={(e) => setToyOrder(e.target.value)}>
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
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
              <div className="stats-card" key={`toy-${row.toy_name}`}>
                <div className="stats-card-head">
                  {toySprite(row.toy_name) ? (
                    <img src={toySprite(row.toy_name)} alt="" />
                  ) : null}
                  <h4>{row.toy_name}</h4>
                </div>
                {filters.scope === "battle" ? (
                  <>
                    <div className="stats-card-meta">Rounds: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Winrate: {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate: {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>Drawrate: {formatPct(gamesWith ? drawsWith / gamesWith : 0)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stats-card-meta">Buy: {gamesWith}</div>
                    <div className="stats-card-metrics">
                      <div>Pickrate: {formatPct(games ? gamesWith / games : 0)}</div>
                      <div>Winrate (Buy): {formatPct(gamesWith ? winsWith / gamesWith : 0)}</div>
                      <div>Lossrate (Buy): {formatPct(gamesWith ? lossesWith / gamesWith : 0)}</div>
                      <div>End: {gamesEnd}</div>
                      <div>End Rate: {formatPct(games ? gamesEnd / games : 0)}</div>
                      <div>Winrate (End): {formatPct(gamesEnd ? winsEnd / gamesEnd : 0)}</div>
                      <div>Lossrate (End): {formatPct(gamesEnd ? lossesEnd / gamesEnd : 0)}</div>
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
      </section>
    </main>
  );
}
