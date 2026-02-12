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

module.exports = canvas;
