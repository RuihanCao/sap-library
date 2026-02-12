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

async function drawPet(ctx, petJSON, x, y, flip) {
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
  ctx.fillText(
    petJSON.attack + petJSON.tempAttack,
    x + PET_WIDTH / 4,
    y + PET_WIDTH + 20
  );
  ctx.fillStyle = "red";
  ctx.fillText(
    petJSON.health + petJSON.tempHealth,
    x + 3 * PET_WIDTH / 4,
    y + PET_WIDTH + 20
  );
  ctx.font = "12px Arial";
  ctx.fillStyle = "grey";
  ctx.fillText(
    "Lvl",
    x,
    y - 6
  );
  ctx.font = "18px Arial";
  ctx.fillStyle = "orange";
  ctx.fillText(
    petJSON.level,
    x + 18,
    y - 7.5
  );

  if (petJSON.xp < 2) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      if (i < petJSON.xp) {
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
      if (i < petJSON.xp - 2) {
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
  ctx.fillText(
    `Lv${toyJSON.level}`,
    x + PET_WIDTH / 2,
    y + 3 * PET_WIDTH / 2
  );
}

module.exports = {
  drawPet,
  drawToy
};
