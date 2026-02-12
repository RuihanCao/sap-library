import { NextResponse } from "next/server";
const { PETS, PERKS, TOYS } = require("@/lib/data");
const { PACK_MAP } = require("@/lib/config");

export const runtime = "nodejs";

export async function GET() {
  const petEntries = Object.values(PETS)
    .filter((p) => p && p.Name && p.NameId)
    .map((p) => ({
      id: String(p.Id),
      name: p.Name,
      sprite: `/Sprite/Pets/${p.NameId}.png`,
      rollable: p.Rollable === true
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
    .map(({ id, name, sprite }) => ({ id, name, sprite }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const perks = Object.values(PERKS)
    .filter((p) => p && p.Name && p.NameId)
    .map((p) => ({
      id: String(p.Id),
      name: p.Name,
      sprite: `/Sprite/Food/${p.NameId}.png`
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const toys = Object.values(TOYS)
    .filter((t) => t && t.Name && t.NameId)
    .map((t) => ({
      id: String(t.Id),
      name: t.Name,
      sprite: `/Sprite/Toys/${t.NameId}.png`
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  const packs = Object.entries(PACK_MAP)
    .map(([id, name]) => ({
      id: String(id),
      name
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  return NextResponse.json(
    { pets, perks, toys, packs },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      }
    }
  );
}
