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

export { BUILD_BACKGROUNDS, THEMES, pickTheme };
