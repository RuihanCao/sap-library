const Canvas = require("./canvas");
const { PET_WIDTH, PLACEHOLDER_SPRITE, PLACEHOLDER_PERK } = require("./config");

async function loadImageSafe(imagePath, fallbackPath) {
  const candidate = typeof imagePath === "string" && imagePath.trim()
    ? imagePath
    : fallbackPath;
  try {
    return await Canvas.loadImage(candidate);
  } catch {
    if (candidate !== fallbackPath) {
      return Canvas.loadImage(fallbackPath);
    }
    throw new Error("failed to load image and fallback");
  }
}

function safeFillText(ctx, value, x, y) {
  const text = value === null || value === undefined ? "" : String(value);
  ctx.fillText(text, x, y);
}

async function drawPet(ctx, petJSON, x, y, flip) {
  const asNum = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const asText = (value, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    return String(value);
  };
  const attack = asNum(petJSON?.attack);
  const tempAttack = asNum(petJSON?.tempAttack);
  const health = asNum(petJSON?.health);
  const tempHealth = asNum(petJSON?.tempHealth);
  const level = asNum(petJSON?.level, 1);
  const xp = asNum(petJSON?.xp, 0);

  const petImage = await loadImageSafe(petJSON?.imagePath, PLACEHOLDER_SPRITE);
  if (flip) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      petImage,
      -(x + PET_WIDTH),
      y,
      PET_WIDTH,
      PET_WIDTH
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      petImage,
      x,
      y,
      PET_WIDTH,
      PET_WIDTH
    );
  }

  if (petJSON.perk) {
    const perkImage = await loadImageSafe(petJSON?.perkImagePath, PLACEHOLDER_PERK);
    ctx.drawImage(perkImage, x + 30, y - 10, 30, 30);
  }

  ctx.font = "18px Arial";
  ctx.fillStyle = "green";
  safeFillText(ctx, asText(attack + tempAttack, "0"), x + PET_WIDTH / 4, y + PET_WIDTH + 20);
  ctx.fillStyle = "red";
  safeFillText(ctx, asText(health + tempHealth, "0"), x + 3 * PET_WIDTH / 4, y + PET_WIDTH + 20);
  ctx.font = "12px Arial";
  ctx.fillStyle = "grey";
  safeFillText(ctx, "Lvl", x, y - 6);
  ctx.font = "18px Arial";
  ctx.fillStyle = "orange";
  safeFillText(ctx, asText(level, "1"), x + 18, y - 7.5);

  if (xp < 2) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      if (i < xp) {
        ctx.fillStyle = "orange";
      } else {
        ctx.fillStyle = "grey";
      }
      ctx.roundRect(x - 9 + i * 16, y - 2, 14, 6, 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      if (i < xp - 2) {
        ctx.fillStyle = "orange";
      } else {
        ctx.fillStyle = "grey";
      }
      ctx.roundRect(x - 9 + i * 12, y - 2, 10, 6, 2);
      ctx.fill();
    }
  }
}

async function drawToy(ctx, toyJSON, x, y) {
  if (!toyJSON?.imagePath) return;
  const toyImage = await loadImageSafe(toyJSON.imagePath, PLACEHOLDER_SPRITE);
  ctx.drawImage(
    toyImage,
    x,
    y,
    PET_WIDTH,
    PET_WIDTH
  );
  ctx.fillStyle = "black";
  ctx.font = "12px Arial";
  safeFillText(ctx, `Lv${toyJSON.level}`, x + PET_WIDTH / 2, y + 3 * PET_WIDTH / 2);
}

module.exports = {
  drawPet,
  drawToy
};
