const fs = require("node:fs");
const path = require("node:path");

const dist = path.resolve(__dirname, "..", "dist");
const requiredRoutes = [
  "/",
  "/tin-tuc",
  "/ve-chung-toi",
  "/tinh-nang/tao-doi-hinh",
  "/tinh-nang/ve-sa-ban",
  "/tinh-nang/tao-chuyen-dong",
];

function fail(message) {
  throw new Error(`[SEO verification] ${message}`);
}

function routeFile(route) {
  return route === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, route.slice(1), "index.html");
}

function assertHtml(route, options = {}) {
  const file = routeFile(route);
  if (!fs.existsSync(file)) fail(`Missing prerendered file for ${route}`);
  const html = fs.readFileSync(file, "utf8");
  const checks = [
    [/<title>[^<]+<\/title>/i, "title"],
    [/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i, "meta description"],
    [/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/doihinhsanco\.pro\.vn/i, "canonical"],
    [/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i, "h1"],
  ];
  if (options.requireHeadingTwo) checks.push([/<h2(?:\s[^>]*)?>[\s\S]*?<\/h2>/i, "h2"]);
  if (options.requireJsonLd) checks.push([/<script[^>]+type=["']application\/ld\+json["']/i, "JSON-LD"]);
  for (const [pattern, label] of checks) {
    if (!pattern.test(html)) fail(`${route} is missing ${label}`);
  }
  if (html.length < 1500) fail(`${route} HTML is unexpectedly small (${html.length} bytes)`);
}

const sitemapFile = path.join(dist, "sitemap.xml");
const robotsFile = path.join(dist, "robots.txt");
if (!fs.existsSync(sitemapFile)) fail("Missing sitemap.xml");
if (!fs.existsSync(robotsFile)) fail("Missing robots.txt");

const sitemap = fs.readFileSync(sitemapFile, "utf8");
const robots = fs.readFileSync(robotsFile, "utf8");
const articleRoutes = [...sitemap.matchAll(/<loc>https:\/\/doihinhsanco\.pro\.vn(\/tin-tuc\/[^<]+)<\/loc>/g)]
  .map((match) => match[1]);

for (const route of requiredRoutes) {
  assertHtml(route, { requireHeadingTwo: true, requireJsonLd: true });
}
if (articleRoutes.length === 0) fail("Sitemap does not contain any Contentful article route");
for (const route of articleRoutes) {
  assertHtml(route, { requireHeadingTwo: true, requireJsonLd: true });
}
if (fs.existsSync(path.join(dist, "app", "index.html"))) fail("Workspace /app must not be prerendered");
if (sitemap.includes("/app")) fail("Workspace /app must not appear in sitemap.xml");
if (!/Disallow:\s*\/app\//i.test(robots)) fail("robots.txt must block /app/");
if (fs.existsSync(path.join(dist, "__prerender-home"))) fail("Temporary homepage route leaked into dist");
const fallback = fs.readFileSync(path.join(dist, "404.html"), "utf8");
if (/rel=["']canonical["']|name=["']description["']|application\/ld\+json/i.test(fallback)) {
  fail("404.html must remain a neutral SPA shell without homepage SEO metadata");
}

console.log(`SEO verification passed for ${requiredRoutes.length + articleRoutes.length} prerendered routes.`);
