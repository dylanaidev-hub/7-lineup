const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
const jsName = html.match(/src="\.\/assets\/([^"]+\.js)"/)?.[1];
const cssName = html.match(/href="\.\/assets\/([^"]+\.css)"/)?.[1];

if (!jsName || !cssName) {
  throw new Error("Could not find built JS/CSS assets in dist/index.html");
}

const js = fs.readFileSync(path.join(distDir, "assets", jsName), "utf8");
const css = fs.readFileSync(path.join(distDir, "assets", cssName), "utf8");

const standaloneHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>doihinhsanco</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`;

fs.writeFileSync(path.join(distDir, "standalone.html"), standaloneHtml);
console.log(path.join(distDir, "standalone.html"));
