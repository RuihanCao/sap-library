"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PackInlineName, PackMatchupInline } from "@/app/components/pack-inline";
import { SemanticLabel } from "@/app/components/semantic-label";
import { fetchClientMeta } from "@/lib/clientMeta";

const PROFILE_NAME_KEY = "sap-library.profileName";
const PROFILE_ID_KEY = "sap-library.profileId";
const GOAT_PLAYER_ID = "310a80b8-0321-4e63-8924-eb462cce9221";
const GOAT_TARGET_TURN = 11;
const GOAT_TARGET_PACK = "Turtle";

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
  scope: "game",
  version: "current",
  opponentName: "",
  lobbyCode: "",
  matchType: "any",
  startDate: "",
  endDate: "",
  pack: "",
  opponentPack: "",
  minTurn: "",
  maxTurn: "",
  pet: [],
  perk: [],
  toy: [],
  tags: ""
};

const PROFILE_GAME_PAGE_SIZE = 10;

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

function getGameTypeIcon(matchType) {
  const type = (matchType || "unknown").toLowerCase();
  if (type === "ranked") return "/Sprite/Cosmetic/CrownHat.png";
  if (type === "arena") return "/Sprite/Food/Mushroom.png";
  if (type === "private") return "/Sprite/Toys/RelicFoamSword.png";
  return "/Sprite/Cosmetic/TrophyHat.png";
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

export default function ProfilePage() {
  const [meta, setMeta] = useState({
    pets: [],
    perks: [],
    toys: [],
    packs: [],
    versions: [],
    currentVersion: null
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [gamesTotal, setGamesTotal] = useState(0);
  const [gamesPage, setGamesPage] = useState(1);
  const [gamesViewMode, setGamesViewMode] = useState("card");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalShareStatus, setModalShareStatus] = useState("");
  const [goatOpen, setGoatOpen] = useState(false);
  const [goatLoading, setGoatLoading] = useState(false);
  const [goatData, setGoatData] = useState(null);
  const [goatError, setGoatError] = useState("");
  const [status, setStatus] = useState("");
  const gamesSentinelRef = useRef(null);
  const suggestionAbortRef = useRef(null);
  const gamesLoadingRef = useRef(false);
  const inFlightGamePagesRef = useRef(new Set());
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
    fetchClientMeta().then(setMeta);
  }, []);

  useEffect(() => {
    gamesLoadingRef.current = gamesLoading;
  }, [gamesLoading]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchProfileSuggestions(term, { forceOpen: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, filters.version]);

  useEffect(() => {
    return () => {
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
      }
    };
  }, []);

  function buildParams(nextFilters = filters, playerIdValue = selectedPlayerId) {
    const params = new URLSearchParams();
    params.set("scope", nextFilters.scope || "game");
    if (nextFilters.version) params.set("version", nextFilters.version);
    if (nextFilters.opponentName) params.set("opponentName", nextFilters.opponentName);
    if (nextFilters.lobbyCode) params.set("lobbyCode", nextFilters.lobbyCode);
    if (nextFilters.matchType && nextFilters.matchType !== "any") params.set("matchType", nextFilters.matchType);
    if (nextFilters.startDate) params.set("startDate", nextFilters.startDate);
    if (nextFilters.endDate) params.set("endDate", nextFilters.endDate);
    if (nextFilters.pack) params.set("pack", nextFilters.pack);
    if (nextFilters.opponentPack) params.set("opponentPack", nextFilters.opponentPack);
    if (nextFilters.scope === "battle") {
      if (nextFilters.minTurn) params.set("minTurn", nextFilters.minTurn);
      if (nextFilters.maxTurn) params.set("maxTurn", nextFilters.maxTurn);
    }
    if (nextFilters.pet.length) params.set("pet", nextFilters.pet.join(","));
    if (nextFilters.perk.length) params.set("perk", nextFilters.perk.join(","));
    if (nextFilters.toy.length) params.set("toy", nextFilters.toy.join(","));
    if (nextFilters.tags) params.set("tags", nextFilters.tags);
    if (playerIdValue) params.set("playerId", playerIdValue);
    return params;
  }

  function buildGameSearchParams(nextFilters = filters, playerIdValue = selectedPlayerId, pageValue = 1) {
    const params = new URLSearchParams();
    if (playerIdValue) params.set("playerId", playerIdValue);
    if (nextFilters.version) params.set("version", nextFilters.version);
    if (nextFilters.opponentName) params.set("opponentName", nextFilters.opponentName);
    if (nextFilters.lobbyCode) params.set("lobbyCode", nextFilters.lobbyCode);
    if (nextFilters.matchType && nextFilters.matchType !== "any") params.set("matchType", nextFilters.matchType);
    if (nextFilters.startDate) params.set("startDate", nextFilters.startDate);
    if (nextFilters.endDate) params.set("endDate", nextFilters.endDate);
    if (nextFilters.pack && nextFilters.opponentPack) {
      params.set("packA", nextFilters.pack);
      params.set("packB", nextFilters.opponentPack);
    } else if (nextFilters.pack) {
      params.set("packA", nextFilters.pack);
    } else if (nextFilters.opponentPack) {
      params.set("packA", nextFilters.opponentPack);
    }
    if (nextFilters.scope === "battle" && nextFilters.minTurn && nextFilters.minTurn === nextFilters.maxTurn) {
      params.set("turn", nextFilters.minTurn);
    }
    if (nextFilters.pet.length) params.set("pet", nextFilters.pet.join(","));
    if (nextFilters.perk.length) params.set("perk", nextFilters.perk.join(","));
    if (nextFilters.toy.length) params.set("toy", nextFilters.toy.join(","));
    if (nextFilters.tags) params.set("tags", nextFilters.tags);

    params.set("sort", "created_at");
    params.set("order", "desc");
    params.set("page", String(pageValue));
    params.set("pageSize", String(PROFILE_GAME_PAGE_SIZE));
    return params;
  }

  async function loadPlayerGames(playerIdValue, nextFilters = filters, options = {}) {
    if (!playerIdValue) {
      setGames([]);
      setGamesTotal(0);
      setGamesPage(1);
      inFlightGamePagesRef.current.clear();
      gamesLoadingRef.current = false;
      return;
    }

    const pageValue = Math.max(1, Number(options.page || 1));
    const appendMode = Boolean(options.append);
    if (appendMode) {
      if (gamesLoadingRef.current) return;
      if (inFlightGamePagesRef.current.has(pageValue)) return;
      inFlightGamePagesRef.current.add(pageValue);
    } else {
      inFlightGamePagesRef.current.clear();
    }

    const params = buildGameSearchParams(nextFilters, playerIdValue, pageValue);
    gamesLoadingRef.current = true;
    setGamesLoading(true);
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      const incoming = Array.isArray(data.results) ? data.results : [];
      setGames((prev) => {
        if (!appendMode) return incoming;
        const seen = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const row of incoming) {
          if (!seen.has(row.id)) {
            merged.push(row);
            seen.add(row.id);
          }
        }
        return merged;
      });
      setGamesTotal(Number(data.total || 0));
      setGamesPage(Number(data.page || pageValue));
    } catch {
      setStatus("Failed to load player games.");
      setTimeout(() => setStatus(""), 1500);
      if (!appendMode) {
        setGames([]);
        setGamesTotal(0);
        setGamesPage(1);
      }
    } finally {
      inFlightGamePagesRef.current.delete(pageValue);
      gamesLoadingRef.current = false;
      setGamesLoading(false);
    }
  }

  async function loadDetail(playerIdValue, nextFilters = filters, options = {}) {
    if (!playerIdValue) {
      setDetail(null);
      setGames([]);
      setGamesTotal(0);
      setGamesPage(1);
      return;
    }
    setLoading(true);
    await loadPlayerGames(playerIdValue, nextFilters, { page: 1 });
    try {
      const params = buildParams(nextFilters, playerIdValue);
      params.delete("playerId");
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(playerIdValue)}?${params.toString()}`);
      const data = await res.json();
      setDetail(data);
      if (data?.playerName) {
        setQuery(data.playerName);
        localStorage.setItem(PROFILE_NAME_KEY, data.playerName);
      }
      if (!options.skipUrlSync) {
        const nextParams = buildParams(nextFilters, playerIdValue);
        nextParams.set("uiView", gamesViewMode);
        window.history.replaceState({}, "", `?${nextParams.toString()}`);
      }
    } catch {
      setStatus("Failed to load profile.");
      setTimeout(() => setStatus(""), 1500);
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setModalShareStatus("");
  }

  async function loadGoatTurnStats() {
    setGoatLoading(true);
    setGoatError("");
    try {
      const params = new URLSearchParams();
      params.set("scope", "battle");
      params.set("version", "current");
      params.set("pack", GOAT_TARGET_PACK);
      const res = await fetch(`/api/leaderboard/${encodeURIComponent(GOAT_PLAYER_ID)}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setGoatData(null);
        setGoatError(data?.error || "Failed to load turn stats.");
        return;
      }

      const perTurn = Array.isArray(data?.perTurn) ? data.perTurn : [];
      const row = perTurn.find((item) => Number(item?.turn_number) === GOAT_TARGET_TURN) || null;
      if (!row) {
        setGoatData({ playerName: data?.playerName || "Unknown", turn: null });
        setGoatError(`No turn ${GOAT_TARGET_TURN} rows found.`);
        return;
      }

      setGoatData({
        playerName: data?.playerName || "Unknown",
        turn: row
      });
    } catch {
      setGoatData(null);
      setGoatError("Failed to load turn stats.");
    } finally {
      setGoatLoading(false);
    }
  }

  async function handleGoatClick() {
    const nextOpen = !goatOpen;
    setGoatOpen(nextOpen);
    if (!nextOpen) return;
    if (goatData || goatLoading) return;
    await loadGoatTurnStats();
  }

  async function copyReplayShareLink() {
    if (!modalData?.replay?.id) return;
    try {
      const url = new URL(window.location.origin);
      url.pathname = "/";
      url.searchParams.set("replay", modalData.replay.id);
      await navigator.clipboard.writeText(url.toString());
      setModalShareStatus("Replay link copied.");
      setTimeout(() => setModalShareStatus(""), 1400);
    } catch {
      setModalShareStatus("Could not copy replay link.");
      setTimeout(() => setModalShareStatus(""), 1400);
    }
  }

  async function copyReplayCode(participationId, sideLabel = "Replay") {
    if (!participationId) {
      setModalShareStatus(`${sideLabel} code unavailable.`);
      setTimeout(() => setModalShareStatus(""), 1400);
      return;
    }
    try {
      const payload = JSON.stringify({ T: 1, Pid: participationId });
      await navigator.clipboard.writeText(payload);
      setModalShareStatus(`${sideLabel} code copied.`);
      setTimeout(() => setModalShareStatus(""), 1400);
    } catch {
      setModalShareStatus("Could not copy replay code.");
      setTimeout(() => setModalShareStatus(""), 1400);
    }
  }

  async function copyPlayerId(playerId) {
    if (!playerId) {
      setModalShareStatus("Player ID unavailable.");
      setTimeout(() => setModalShareStatus(""), 1400);
      return;
    }
    try {
      await navigator.clipboard.writeText(playerId);
      setModalShareStatus("Player ID copied.");
      setTimeout(() => setModalShareStatus(""), 1400);
    } catch {
      setModalShareStatus("Could not copy player ID.");
      setTimeout(() => setModalShareStatus(""), 1400);
    }
  }

  async function openModal(replayId) {
    if (!replayId) return;
    setModalOpen(true);
    setModalLoading(true);
    setModalData(null);
    setModalShareStatus("");
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

  function switchGamesView(nextView) {
    const normalized = nextView === "list" ? "list" : "card";
    setGamesViewMode(normalized);
  }

  async function fetchProfileSuggestions(queryValue, options = {}) {
    const term = (queryValue || "").trim();
    if (!term) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return [];
    }

    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
    }

    const controller = new AbortController();
    suggestionAbortRef.current = controller;
    setSuggestionsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", term);
      params.set("limit", "12");
      if (filters.version) params.set("version", filters.version);
      const res = await fetch(`/api/profile/players?${params.toString()}`, {
        signal: controller.signal
      });
      const data = await res.json().catch(() => ({}));
      const players = Array.isArray(data.players) ? data.players : [];
      setSuggestions(players);
      setSuggestionsOpen(Boolean(options.forceOpen ?? true) && players.length > 0);
      return players;
    } catch {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return [];
    } finally {
      if (suggestionAbortRef.current === controller) {
        suggestionAbortRef.current = null;
      }
      setSuggestionsLoading(false);
    }
  }

  async function chooseSuggestion(player, options = {}) {
    if (!player?.playerId) return;
    setSelectedPlayerId(player.playerId);
    const nextName = player.latestName || player.playerId;
    setQuery(nextName);
    setSuggestionsOpen(false);
    setSuggestions([]);
    localStorage.setItem(PROFILE_ID_KEY, player.playerId);
    localStorage.setItem(PROFILE_NAME_KEY, nextName);
    if (options.statusText) {
      setStatus(options.statusText);
      setTimeout(() => setStatus(""), 1500);
    }
    await loadDetail(player.playerId, filters);
  }

  async function saveProfile() {
    const term = (query || "").trim();
    if (!term) {
      setStatus("Enter a player name or ID.");
      setTimeout(() => setStatus(""), 1500);
      return;
    }

    const currentSuggestions = suggestions.length ? suggestions : await fetchProfileSuggestions(term, { forceOpen: false });
    if (!currentSuggestions.length) {
      setStatus("No player found.");
      setTimeout(() => setStatus(""), 1500);
      return;
    }

    const lower = term.toLowerCase();
    const exactId = currentSuggestions.find((player) => (player.playerId || "").toLowerCase() === lower);
    if (exactId) {
      await chooseSuggestion(exactId, { statusText: "Profile saved." });
      return;
    }

    const exactNameMatches = currentSuggestions.filter(
      (player) => (player.latestName || "").toLowerCase() === lower
    );

    if (exactNameMatches.length === 1) {
      await chooseSuggestion(exactNameMatches[0], { statusText: "Profile saved." });
      return;
    }

    if (currentSuggestions.length === 1) {
      await chooseSuggestion(currentSuggestions[0], { statusText: "Profile saved." });
      return;
    }

    setSuggestions(currentSuggestions);
    setSuggestionsOpen(true);
    setStatus("Multiple players found. Select one from suggestions.");
    setTimeout(() => setStatus(""), 1500);
  }

  function clearProfile() {
    setQuery("");
    setSelectedPlayerId("");
    setDetail(null);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setGames([]);
    setGamesTotal(0);
    setGamesPage(1);
    setModalOpen(false);
    setModalData(null);
    inFlightGamePagesRef.current.clear();
    gamesLoadingRef.current = false;
    localStorage.removeItem(PROFILE_ID_KEY);
    localStorage.removeItem(PROFILE_NAME_KEY);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function applyFilters(e) {
    e.preventDefault();
    if (!selectedPlayerId) return;
    loadDetail(selectedPlayerId, filters);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    if (selectedPlayerId) {
      loadDetail(selectedPlayerId, DEFAULT_FILTERS);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playerIdFromUrl = params.get("playerId") || "";
    const uiViewFromUrl = (params.get("uiView") || "card").toLowerCase();
    const nextFilters = {
      ...DEFAULT_FILTERS,
      scope: params.get("scope") === "battle" ? "battle" : "game",
      version: params.get("version") || "current",
      opponentName: params.get("opponentName") || "",
      lobbyCode: params.get("lobbyCode") || "",
      matchType: params.get("matchType") || "any",
      startDate: params.get("startDate") || "",
      endDate: params.get("endDate") || "",
      pack: params.get("pack") || "",
      opponentPack: params.get("opponentPack") || "",
      minTurn: params.get("minTurn") || "",
      maxTurn: params.get("maxTurn") || "",
      pet: parseCsvList(params.get("pet")),
      perk: parseCsvList(params.get("perk")),
      toy: parseCsvList(params.get("toy")),
      tags: params.get("tags") || ""
    };
    setFilters(nextFilters);
    setGamesViewMode(uiViewFromUrl === "list" ? "list" : "card");

    const storedId = localStorage.getItem(PROFILE_ID_KEY) || "";
    const storedName = localStorage.getItem(PROFILE_NAME_KEY) || "";
    const initialPlayerId = playerIdFromUrl || storedId;
    const initialName = storedName || initialPlayerId;
    if (initialName) setQuery(initialName);
    if (initialPlayerId) {
      setSelectedPlayerId(initialPlayerId);
      loadDetail(initialPlayerId, nextFilters, { skipUrlSync: true });
    }
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    const node = gamesSentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (gamesLoadingRef.current) return;
        if (games.length >= gamesTotal) return;
        loadPlayerGames(selectedPlayerId, filters, { page: gamesPage + 1, append: true });
      },
      { root: null, rootMargin: "240px 0px", threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [selectedPlayerId, filters, games.length, gamesTotal, gamesPage]);

  const isArena = (type) => (type || "").toLowerCase() === "arena";
  const isMulti = (replay) => {
    if (!replay) return false;
    const activeCount = Number(replay.active_player_count ?? 0);
    return Number.isFinite(activeCount) && activeCount > 2;
  };

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Player Profile</h1>
          <p>Save a player and view the same detailed player analytics used by leaderboard.</p>
        </div>
        <nav className="top-nav">
          <Link href="/" className="nav-link">Explorer</Link>
          <Link href="/stats" className="nav-link">Stats</Link>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
          <Link href="/profile" className="nav-link active">Profile</Link>
        </nav>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Profile Identity</h2>
          <div className="section-actions">
            <button type="button" className="secondary" onClick={saveProfile}>Save / Load</button>
            <button type="button" className="ghost" onClick={clearProfile}>Clear</button>
          </div>
        </div>
        <div className="filters">
          <div className="field profile-search-field">
            <label>Player Name or ID</label>
            <input
              placeholder="Enter player name or UUID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length) setSuggestionsOpen(true);
              }}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestionsOpen && suggestions.length) {
                    chooseSuggestion(suggestions[0], { statusText: "Profile saved." });
                    return;
                  }
                  saveProfile();
                }
              }}
            />
            {suggestionsOpen && (query || "").trim() && (
              <div className="profile-suggest-list">
                {suggestionsLoading && <div className="profile-suggest-empty">Searching...</div>}
                {!suggestionsLoading && suggestions.length === 0 && (
                  <div className="profile-suggest-empty">No matches</div>
                )}
                {!suggestionsLoading && suggestions.map((player) => {
                  const latest = player.latestName || player.playerId;
                  const alias = (player.matchedNames || []).find(
                    (name) => (name || "").toLowerCase() !== (latest || "").toLowerCase()
                  );
                  return (
                    <button
                      key={player.playerId}
                      type="button"
                      className="profile-suggest-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(player, { statusText: "Profile saved." })}
                    >
                      <div className="profile-suggest-main">{latest}</div>
                      <div className="profile-suggest-sub">
                        {player.playerId}
                        {alias ? ` • aka ${alias}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="field">
            <label>Resolved Player ID</label>
            <input value={selectedPlayerId} readOnly placeholder="No player selected" />
          </div>
        </div>
        {status ? <div className="status">{status}</div> : null}
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Profile Detail</h2>
          <div className="status">
            {loading ? "Loading..." : (detail?.playerName || selectedPlayerId || "No player selected")}
          </div>
        </div>

        {detail && !loading ? (
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
                <strong className="rate-win">{Number(detail.summary?.wins || 0)}</strong>
              </div>
              <div className="stats-summary-item">
                <span className="label">Losses</span>
                <strong className="rate-loss">{Number(detail.summary?.losses || 0)}</strong>
              </div>
              {filters.scope === "battle" && (
                <div className="stats-summary-item">
                  <span className="label">Draws</span>
                  <strong>{Number(detail.summary?.draws || 0)}</strong>
                </div>
              )}
              <div className="stats-summary-item">
                <span className="label">Winrate</span>
                <strong className="rate-win">{pct(detail.summary?.winrate)}</strong>
              </div>
              <div className="stats-summary-item">
                <span className="label">Lossrate</span>
                <strong className="rate-loss">{pct(detail.summary?.lossrate)}</strong>
              </div>
              {filters.scope === "battle" && (
                <div className="stats-summary-item">
                  <span className="label">Drawrate</span>
                  <strong>{pct(detail.summary?.drawrate)}</strong>
                </div>
              )}
              <div className="stats-summary-item">
                <span className="label">
                  <SemanticLabel type="turn">Avg Rolls/Turn</SemanticLabel>
                </span>
                <strong>{fixed(detail.summary?.avgRollsPerTurn)}</strong>
              </div>
              <div className="stats-summary-item">
                <span className="label gold-text">
                  <SemanticLabel type="turn">Avg Gold/Turn</SemanticLabel>
                </span>
                <strong className="gold-text">{fixed(detail.summary?.avgGoldPerTurn)}</strong>
              </div>
              <div className="stats-summary-item">
                <span className="label">Total Elo Gain</span>
                <strong className={Number(detail.summary?.totalEloGain || 0) >= 0 ? "rate-win" : "rate-loss"}>
                  {Number(detail.summary?.totalEloGain || 0)}
                </strong>
              </div>
              <div className="stats-summary-item">
                <span className="label">Avg Elo Gain</span>
                <strong className={Number(detail.summary?.avgEloGain || 0) >= 0 ? "rate-win" : "rate-loss"}>
                  {fixed(detail.summary?.avgEloGain, 2)}
                </strong>
              </div>
            </div>

            <div className="leaderboard-detail-grid">
              <div className="leaderboard-detail-block">
                <h3>Pack Pickrate</h3>
                <div className="stats-cards">
                  {detail.packStats?.map((row) => (
                    <div className="stats-card" key={`pack-${row.pack}`}>
                      <div className="stats-card-head">
                        <PackInlineName name={row.pack} className="pack-name-inline stats-card-pack-inline" />
                      </div>
                      <div className="stats-card-metrics">
                        <div>{filters.scope === "battle" ? "Rounds" : "Games"}: {Number(row.rounds ?? row.games ?? 0)}</div>
                        <div className="rate-win">Wins: {Number(row.wins || 0)}</div>
                        <div className="rate-loss">Losses: {Number(row.losses || 0)}</div>
                        {filters.scope === "battle" && <div>Draws: {Number(row.draws || 0)}</div>}
                        <div className="rate-win">Winrate: {pct(row.winrate)}</div>
                      </div>
                    </div>
                  ))}
                  {!detail.packStats?.length && <div className="stats-card empty">No pack stats.</div>}
                </div>
              </div>

              <div className="leaderboard-detail-block">
                <h3>Matchup Winrates</h3>
                <div className="leaderboard-subtable">
                  <div className={`leaderboard-subrow matchup ${filters.scope === "battle" ? "battle" : "game"} head`}>
                    <span>Matchup</span>
                    <span>{filters.scope === "battle" ? "Rounds" : "Games"}</span>
                    <span>Wins</span>
                    <span>Losses</span>
                    {filters.scope === "battle" && <span>Draws</span>}
                    <span>Winrate</span>
                  </div>
                  {detail.matchupStats?.map((row) => (
                    <div className={`leaderboard-subrow matchup ${filters.scope === "battle" ? "battle" : "game"}`} key={`${row.pack}-${row.opponent_pack}`}>
                      <span>
                        <PackMatchupInline pack={row.pack} opponentPack={row.opponent_pack} />
                      </span>
                      <span>{Number(row.rounds ?? row.games ?? 0)}</span>
                      <span className="rate-win">{Number(row.wins || 0)}</span>
                      <span className="rate-loss">{Number(row.losses || 0)}</span>
                      {filters.scope === "battle" && <span>{Number(row.draws || 0)}</span>}
                      <span className="rate-win">{pct(row.winrate)}</span>
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
              <h3>
                <SemanticLabel type="turn">Per Turn Metrics</SemanticLabel>
              </h3>
              <div className="leaderboard-subtable">
                <div className="leaderboard-subrow turn head">
                  <span>
                    <SemanticLabel type="turn">Turn</SemanticLabel>
                  </span>
                  <span>Rounds</span>
                  <span>Wins</span>
                  <span>Losses</span>
                  <span>Draws</span>
                  <span>Winrate</span>
                  <span>Avg Rolls</span>
                  <span className="gold-text">Avg Gold</span>
                </div>
                {detail.perTurn?.map((row) => (
                  <div className="leaderboard-subrow turn" key={`turn-${row.turn_number}`}>
                    <span>{row.turn_number}</span>
                    <span>{Number(row.rounds || 0)}</span>
                    <span className="rate-win">{Number(row.wins || 0)}</span>
                    <span className="rate-loss">{Number(row.losses || 0)}</span>
                    <span>{Number(row.draws || 0)}</span>
                    <span className="rate-win">{pct(row.winrate)}</span>
                    <span>{fixed(row.avg_rolls_per_turn)}</span>
                    <span className="gold-text">{fixed(row.avg_gold_per_turn)}</span>
                  </div>
                ))}
                {!detail.perTurn?.length && (
                  <div className="leaderboard-subrow empty">
                    <span>
                      <SemanticLabel type="turn">No turn-level rows.</SemanticLabel>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Save or select a profile to view player detail.</div>
        )}
      </section>

      <section className="section filters-section">
        <div className="section-head">
          <h2>Profile Filters</h2>
        </div>
        <form onSubmit={applyFilters}>
          <div className="filters">
            <div className="field">
              <label>Scope</label>
              <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
                <option value="game">Per Game</option>
                <option value="battle">Per Round</option>
              </select>
            </div>
            <div className="field">
              <label>Version</label>
              <select value={filters.version} onChange={(e) => setFilters({ ...filters, version: e.target.value })}>
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
              <label>Match Type</label>
              <select value={filters.matchType} onChange={(e) => setFilters({ ...filters, matchType: e.target.value })}>
                <option value="any">Any</option>
                <option value="ranked">Ranked</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="field">
              <label>Opponent Name</label>
              <input
                value={filters.opponentName}
                onChange={(e) => setFilters({ ...filters, opponentName: e.target.value })}
                placeholder="Filter by opponent"
              />
            </div>
            <div className="field">
              <label>Lobby Code</label>
              <input
                value={filters.lobbyCode}
                onChange={(e) => setFilters({ ...filters, lobbyCode: e.target.value })}
                placeholder="e.g. OWEN2"
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
              <label>Your Pack</label>
              <select value={filters.pack} onChange={(e) => setFilters({ ...filters, pack: e.target.value })}>
                <option value="">Any</option>
                {meta.packs.map((pack) => (
                  <option key={pack.id} value={pack.name}>{pack.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Opponent Pack</label>
              <select value={filters.opponentPack} onChange={(e) => setFilters({ ...filters, opponentPack: e.target.value })}>
                <option value="">Any</option>
                {meta.packs.map((pack) => (
                  <option key={pack.id} value={pack.name}>{pack.name}</option>
                ))}
              </select>
            </div>
            {filters.scope === "battle" && (
              <>
                <div className="field">
                  <label>
                    <SemanticLabel type="turn">Min Turn</SemanticLabel>
                  </label>
                  <input value={filters.minTurn} onChange={(e) => setFilters({ ...filters, minTurn: e.target.value })} placeholder="1" />
                </div>
                <div className="field">
                  <label>
                    <SemanticLabel type="turn">Max Turn</SemanticLabel>
                  </label>
                  <input value={filters.maxTurn} onChange={(e) => setFilters({ ...filters, maxTurn: e.target.value })} placeholder="15" />
                </div>
              </>
            )}
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
            <div className="field">
              <label>Tags (comma)</label>
              <input
                value={filters.tags}
                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                placeholder="tournament, finals"
              />
            </div>
          </div>
          <div className="actions">
            <button type="submit" disabled={!selectedPlayerId}>Apply</button>
            <button type="button" className="secondary" onClick={resetFilters}>Reset</button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="results-header">
          <h2>Player Games</h2>
          <div className="results-actions">
            <div className="status">
              {selectedPlayerId
                ? (gamesLoading ? "Loading..." : `${gamesTotal} results`)
                : "No player selected"}
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={gamesViewMode === "card" ? "toggle active" : "toggle"}
                onClick={() => switchGamesView("card")}
              >
                Card
              </button>
              <button
                type="button"
                className={gamesViewMode === "list" ? "toggle active" : "toggle"}
                onClick={() => switchGamesView("list")}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {selectedPlayerId ? (
          <>
            <div className={gamesViewMode === "list" ? "results list-view" : "results"}>
              {games.map((r) => {
                const worldOpponent = isArena(r.match_type) || isMulti(r);
                const playerWon = Number(r.last_outcome) === 1;
                const opponentWon = Number(r.last_outcome) === 2;
                const playerSideClass = playerWon ? "winner-side" : opponentWon ? "loser-side" : "";
                const opponentSideClass = opponentWon ? "winner-side" : playerWon ? "loser-side" : "";
                const playerPackClass = playerWon ? "winner-pack" : opponentWon ? "loser-pack" : "";
                const opponentPackClass = opponentWon ? "winner-pack" : playerWon ? "loser-pack" : "";
                const playerNameClass = playerWon ? "winner-name" : opponentWon ? "loser-name" : "";
                const opponentNameClass = opponentWon ? "winner-name" : playerWon ? "loser-name" : "";
                const playerMatchupClass = `pack-name-inline matchup-pack ${playerPackClass}`.trim();
                const opponentMatchupClass = `pack-name-inline matchup-pack ${opponentPackClass}`.trim();

                return gamesViewMode === "list" ? (
                  <div
                    className="list-row"
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModal(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && openModal(r.id)}
                  >
                    <div className={`list-player ${playerSideClass}`}>
                      <div className="list-player-name">
                        <span>{r.player_name || "Unknown Player"}</span>
                        {playerWon ? <img className="winner-trophy-inline" src="/Sprite/Cosmetic/Trophy_2x%20%23103437.png" alt="Winner" /> : null}
                      </div>
                      <div className="list-player-rank">Rank {r.player_rank ?? "?"}</div>
                    </div>

                    <div className="list-matchup-col">
                      <div className="list-pack-line">
                        <PackInlineName name={r.pack} className={`pack-pill ${playerPackClass}`} />
                        <span className="vs-line">vs</span>
                        <PackInlineName name={r.opponent_pack} className={`pack-pill ${opponentPackClass}`} />
                      </div>
                      <div className="list-matchup-sub">{(r.match_type || "unknown").toUpperCase()}</div>
                    </div>

                    <div className={`list-player list-player-right ${opponentSideClass}`}>
                      <div className={`list-player-name ${worldOpponent ? "world-name" : ""}`}>
                        <span>{worldOpponent ? "The World" : (r.opponent_name || "Unknown")}</span>
                        {opponentWon ? <img className="winner-trophy-inline" src="/Sprite/Cosmetic/Trophy_2x%20%23103437.png" alt="Winner" /> : null}
                      </div>
                      <div className="list-player-rank">Rank {worldOpponent ? "-" : (r.opponent_rank ?? "?")}</div>
                    </div>

                    <div className="list-time">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                ) : (
                  <div className="card" key={r.id} role="button" tabIndex={0} onClick={() => openModal(r.id)} onKeyDown={(e) => e.key === "Enter" && openModal(r.id)}>
                    <div className="card-head">
                      <h3>
                        <span className={`name-line winner-line ${playerNameClass}`}>
                          {r.player_name || "Unknown Player"}
                          {playerWon ? <img className="winner-trophy-inline" src="/Sprite/Cosmetic/Trophy_2x%20%23103437.png" alt="Winner" /> : null}
                        </span>
                        <span className="name-line vs-line">vs</span>
                        {worldOpponent ? (
                          <span className={`name-line world-name winner-line ${opponentNameClass}`}>
                            The World
                            {opponentWon ? <img className="winner-trophy-inline" src="/Sprite/Cosmetic/Trophy_2x%20%23103437.png" alt="Winner" /> : null}
                          </span>
                        ) : (
                          <span className={`name-line winner-line ${opponentNameClass}`}>
                            {r.opponent_name || "Unknown"}
                            {opponentWon ? <img className="winner-trophy-inline" src="/Sprite/Cosmetic/Trophy_2x%20%23103437.png" alt="Winner" /> : null}
                          </span>
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
                    <div className="muted matchup-line">
                      <span>Matchup:</span>
                      <PackMatchupInline
                        pack={r.pack}
                        opponentPack={r.opponent_pack}
                        leftClassName={playerMatchupClass}
                        rightClassName={opponentMatchupClass}
                      />
                    </div>
                    <div className="replay-image-wrap">
                      <img
                        className="replay-image"
                        src={`/api/replays/${r.id}/image?v=${encodeURIComponent(r.created_at || replayImageVersion)}`}
                        alt="Replay"
                        loading="lazy"
                        decoding="async"
                        onLoad={(e) => e.currentTarget.closest(".replay-image-wrap")?.classList.add("loaded")}
                        onError={(e) => e.currentTarget.closest(".replay-image-wrap")?.classList.add("loaded")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!gamesLoading && !games.length ? (
              <div className="empty-state">No games match the current profile filters.</div>
            ) : null}

            <div className="infinite-footer">
              <div className="page-info">{games.length} / {gamesTotal}</div>
              <div ref={gamesSentinelRef} className="list-sentinel" />
              {gamesLoading && games.length < gamesTotal ? <div className="muted">Loading more...</div> : null}
            </div>
          </>
        ) : (
          <div className="empty-state">Save or select a profile to view games.</div>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Replay Details</h3>
              <div className="modal-head-actions">
                <button className="ghost" type="button" onClick={copyReplayShareLink}>Share</button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => copyReplayCode(modalData?.replay?.participation_id, "Player 1")}
                >
                  Copy P1 Code
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => copyReplayCode(modalData?.replay?.opponent_participation_id, "Player 2")}
                >
                  Copy P2 Code
                </button>
                <button className="ghost" type="button" onClick={closeModal}>Close</button>
              </div>
            </div>
            {modalShareStatus ? <div className="status">{modalShareStatus}</div> : null}
            {modalLoading && <div className="muted">Loading...</div>}
            {!modalLoading && modalData?.error && <div className="muted">{modalData.error}</div>}
            {!modalLoading && modalData?.replay && (
              <>
                <div className="modal-grid">
                  <div>
                    <span className="label">Matchup</span>
                    <span>
                      <PackMatchupInline
                        pack={modalData.replay.pack}
                        opponentPack={modalData.replay.opponent_pack}
                      />
                    </span>
                  </div>
                  <div><span className="label">Game Type</span><span>{(modalData.replay.match_type || "unknown").toUpperCase()}</span></div>
                  <div><span className="label">Version</span><span>{modalData.replay.game_version || "?"}</span></div>
                  <div>
                    <span className="label">Played</span>
                    <span>{modalData.replay.created_at ? new Date(modalData.replay.created_at).toLocaleString() : "?"}</span>
                  </div>
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
                    <div className="stat">
                      <span className="label">Replay Code</span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => copyReplayCode(modalData.replay.participation_id, "Player 1")}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="stat">
                      <span className="label">Rank</span>
                      <span>{modalData.replay.player_rank_display ?? modalData.replay.player_rank ?? "?"}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Gold Spent</span>
                      <span>{modalData.stats?.player_gold_spent ?? "?"}</span>
                    </div>
                    <div className="stat"><span className="label">Rolls</span><span>{modalData.stats?.player_rolls ?? "?"}</span></div>
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
                      <div className="stat">
                        <span className="label">Replay Code</span>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => copyReplayCode(modalData.replay.opponent_participation_id, "Player 2")}
                        >
                          Copy
                        </button>
                      </div>
                      <div className="stat">
                        <span className="label">Rank</span>
                        <span>{modalData.replay.opponent_rank_display ?? modalData.replay.opponent_rank ?? "?"}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Gold Spent</span>
                        <span>{modalData.stats?.opponent_gold_spent ?? "?"}</span>
                      </div>
                      <div className="stat"><span className="label">Rolls</span><span>{modalData.stats?.opponent_rolls ?? "?"}</span></div>
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

      <div className="goat-turn-widget">
        <button
          type="button"
          className="goat-turn-widget-trigger"
          onClick={handleGoatClick}
          title="Turn 11 Goat Stats"
          aria-label="Toggle Turn 11 Goat Stats"
        >
          <img src="/Sprite/Pets/Goat.png" alt="" />
        </button>
        {goatOpen ? (
          <div className="goat-turn-widget-panel">
            <div className="goat-turn-widget-head">
              <strong>Turn {GOAT_TARGET_TURN} (Buh Theory)</strong>
              <button type="button" className="ghost" onClick={loadGoatTurnStats}>Refresh</button>
            </div>
            <div className="muted">{GOAT_TARGET_PACK} pack only</div>
            <div className="goat-turn-widget-player">{goatData?.playerName || "Loading..."}</div>
            {goatLoading ? <div className="muted">Loading...</div> : null}
            {!goatLoading && goatError ? <div className="muted">{goatError}</div> : null}
            {!goatLoading && goatData?.turn ? (
              <div className="goat-turn-widget-grid">
                <div><span>Rounds</span><strong>{Number(goatData.turn.rounds || 0)}</strong></div>
                <div><span>Wins</span><strong className="rate-win">{Number(goatData.turn.wins || 0)}</strong></div>
                <div><span>Losses</span><strong className="rate-loss">{Number(goatData.turn.losses || 0)}</strong></div>
                <div><span>Draws</span><strong>{Number(goatData.turn.draws || 0)}</strong></div>
                <div><span>Winrate</span><strong className="rate-win">{pct(goatData.turn.winrate)}</strong></div>
                <div><span>Avg Rolls</span><strong>{fixed(goatData.turn.avg_rolls_per_turn)}</strong></div>
                <div><span>Avg Gold</span><strong className="gold-text">{fixed(goatData.turn.avg_gold_per_turn)}</strong></div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
