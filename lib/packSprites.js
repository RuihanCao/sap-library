export const PACK_SPRITES = Object.freeze({
  Turtle: "/Sprite/Pets/Turtle.png",
  Puppy: "/Sprite/Pets/Puppy.png",
  Star: "/Sprite/Pets/Starfish.png",
  Golden: "/Sprite/Pets/GoldenRetriever.png",
  Unicorn: "/Sprite/Pets/Unicorn.png",
  Danger: "/Sprite/Pets/BlueWhale.png",
  Custom: "/Sprite/Pets/WhiteTiger.png",
  Weekly: "/Sprite/Pets/Tiger.png"
});

const PACK_SPRITES_BY_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(PACK_SPRITES).map(([name, sprite]) => [name.toLowerCase(), sprite])
  )
);

export function getPackSprite(packName) {
  if (!packName) return null;
  return PACK_SPRITES_BY_KEY[String(packName).trim().toLowerCase()] || null;
}
