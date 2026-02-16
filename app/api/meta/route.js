import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAvailableVersions, getCurrentVersion } from "@/lib/versionFilter";
const { PETS, PERKS, FOODS, TOYS } = require("@/lib/data");
const { PACK_MAP } = require("@/lib/config");

export const runtime = "nodejs";

const PACK_CODE_TO_NAME = {
  Pack1: "Turtle",
  Pack2: "Puppy",
  Pack3: "Star",
  Pack4: "Golden",
  Pack5: "Unicorn",
  Danger: "Danger",
  Custom: "Custom",
  Weekly: "Weekly"
};

function normalizePackList(packCodes = []) {
  return Array.from(
    new Set(
      (packCodes || [])
        .map((code) => PACK_CODE_TO_NAME[code] || code)
        .filter(Boolean)
    )
  );
}

export async function GET() {
  const petEntries = Object.values(PETS)
    .filter((p) => p && p.Name && p.NameId)
    .map((p) => ({
      id: String(p.Id),
      name: p.Name,
      sprite: `/Sprite/Pets/${p.NameId}.png`,
      rollable: p.Rollable === true,
      tier: Number.isFinite(Number(p.Tier)) ? Number(p.Tier) : null,
      packs: normalizePackList(p.Packs)
    }));

  const pets = Object.values(
    petEntries.reduce((acc, pet) => {
      const existing = acc[pet.name];
      if (!existing) {
        acc[pet.name] = pet;
        return acc;
      }
      if (pet.rollable && !existing.rollable) {
        acc[pet.name] = pet;
        return acc;
      }
      if (pet.rollable === existing.rollable) {
        const currentId = Number(existing.id);
        const nextId = Number(pet.id);
        if (Number.isFinite(nextId) && Number.isFinite(currentId) && nextId < currentId) {
          acc[pet.name] = pet;
        }
      }
      return acc;
    }, {})
  )
    .map(({ id, name, sprite, tier, packs }) => ({ id, name, sprite, tier, packs }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const foodByName = Object.values(FOODS).reduce((acc, food) => {
    if (!food?.Name) return acc;
    const existing = acc[food.Name];
    if (!existing) {
      acc[food.Name] = food;
      return acc;
    }
    const currentTier = Number(existing?.Tier ?? Number.MAX_SAFE_INTEGER);
    const nextTier = Number(food?.Tier ?? Number.MAX_SAFE_INTEGER);
    if (nextTier < currentTier) {
      acc[food.Name] = food;
    }
    return acc;
  }, {});

  const perks = Object.values(PERKS)
    .filter((p) => p && p.Name && p.NameId)
    .map((p) => ({
      id: String(p.Id),
      name: p.Name,
      sprite: `/Sprite/Food/${p.NameId}.png`,
      tier: Number.isFinite(Number(foodByName[p.Name]?.Tier)) ? Number(foodByName[p.Name].Tier) : null,
      packs: normalizePackList(foodByName[p.Name]?.Packs || [])
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const toys = Object.values(TOYS)
    .filter((t) => t && t.Name && t.NameId)
    .map((t) => ({
      id: String(t.Id),
      name: t.Name,
      sprite: `/Sprite/Toys/${t.NameId}.png`,
      tier: Number.isFinite(Number(t.Tier)) ? Number(t.Tier) : null,
      packs: normalizePackList(t.Packs || [])
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const packs = Object.entries(PACK_MAP)
    .map(([id, name]) => ({
      id: String(id),
      name
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  let versions = [];
  let currentVersion = null;
  let seasons = [];
  try {
    versions = await getAvailableVersions(pool);
    currentVersion = await getCurrentVersion(pool);
    const seasonRes = await pool.query(`
      select distinct lower(coalesce(
        nullif(raw_json->>'Season', ''),
        nullif((nullif(raw_json->>'GenesisModeModel', '')::jsonb->>'Season'), ''),
        game_version
      )) as season
      from replays
      where coalesce(
        nullif(raw_json->>'Season', ''),
        nullif((nullif(raw_json->>'GenesisModeModel', '')::jsonb->>'Season'), ''),
        game_version
      ) is not null
      order by season desc
    `);
    seasons = seasonRes.rows.map((row) => row.season).filter(Boolean);
  } catch {
    versions = [];
    currentVersion = null;
    seasons = [];
  }

  return NextResponse.json(
    { pets, perks, toys, packs, versions, currentVersion, seasons },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      }
    }
  );
}
