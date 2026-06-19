const fs = require("node:fs");
const path = require("node:path");

const dist = path.resolve(__dirname, "..", "dist");
const temporaryHomeDirectory = path.join(dist, "__prerender-home");
const temporaryHome = path.join(temporaryHomeDirectory, "index.html");
const homepage = path.join(dist, "index.html");

if (!fs.existsSync(temporaryHome)) {
  throw new Error("Prerendered homepage was not generated at /__prerender-home");
}

fs.copyFileSync(temporaryHome, homepage);
fs.rmSync(temporaryHomeDirectory, { recursive: true, force: true });
console.log("Finalized prerendered homepage.");
