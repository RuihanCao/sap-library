const path = require("path");

let canvas;

try {
  canvas = require("@napi-rs/canvas");
} catch (err) {
  try {
    canvas = require("canvas");
  } catch {
    throw err;
  }
}

function registerFallbackFont() {
  const fontPath = path.join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf");

  try {
    if (canvas?.GlobalFonts?.registerFromPath) {
      canvas.GlobalFonts.registerFromPath(fontPath, "Arial");
      canvas.GlobalFonts.registerFromPath(fontPath, "sans-serif");
      return;
    }

    if (typeof canvas?.registerFont === "function") {
      canvas.registerFont(fontPath, { family: "Arial" });
      canvas.registerFont(fontPath, { family: "sans-serif" });
    }
  } catch {
    // If registration fails we still render sprites; text falls back to runtime fonts.
  }
}

registerFallbackFont();

module.exports = canvas;
