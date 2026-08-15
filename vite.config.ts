import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import prerender from "@prerenderer/rollup-plugin";

const SITE_URL = "https://doihinhsanco.pro.vn";
const STATIC_ROUTES = [
  "/",
  "/tin-tuc",
  "/ve-chung-toi",
  "/tinh-nang/tao-doi-hinh",
  "/tinh-nang/ve-sa-ban",
  "/tinh-nang/tao-chuyen-dong",
];

type ContentfulRoute = { slug: string; updatedAt?: string };

async function fetchContentfulRoutes(env: Record<string, string>): Promise<ContentfulRoute[]> {
  const spaceId = env.VITE_CONTENTFUL_SPACE_ID;
  const token = env.VITE_CONTENTFUL_ACCESS_TOKEN;
  const environment = env.VITE_CONTENTFUL_ENVIRONMENT || "master";
  const contentType = env.VITE_CONTENTFUL_CONTENT_TYPE || "lineupFootball";
  if (!spaceId || !token) {
    throw new Error("Missing VITE_CONTENTFUL_SPACE_ID or VITE_CONTENTFUL_ACCESS_TOKEN for prerender build");
  }

  const params = new URLSearchParams({
    content_type: contentType,
    select: "sys.id,sys.updatedAt,fields.slug,fields.title,fields.content",
    limit: "1000",
  });
  const response = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`Contentful route request failed (${response.status})`);
  const payload = await response.json() as {
    items?: Array<{ sys?: { updatedAt?: string }; fields?: { slug?: string; title?: string; content?: unknown } }>;
  };
  return (payload.items ?? []).flatMap((entry) => {
    const slug = entry.fields?.slug?.trim();
    return slug && entry.fields?.title && entry.fields?.content
      ? [{ slug, updatedAt: entry.sys?.updatedAt }]
      : [];
  });
}

function seoFilesPlugin(routes: string[], articles: ContentfulRoute[]): Plugin {
  return {
    name: "lineup-football-seo-files",
    apply: "build",
    async closeBundle() {
      const dist = path.resolve("dist");
      const articleDates = new Map(articles.map((article) => [`/tin-tuc/${article.slug}`, article.updatedAt]));
      const sitemap = routes.map((route) => {
        const lastmod = articleDates.get(route);
        return `  <url><loc>${SITE_URL}${route === "/" ? "/" : route}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
      }).join("\n");
      await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`, "utf8");
      await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /s/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");

      const redirects = [
        { from: "/tin-tuc-kien-thuc", to: "/tin-tuc" },
        ...articles.map(({ slug }) => ({ from: `/tin-tuc-kien-thuc/${slug}`, to: `/tin-tuc/${slug}` })),
      ];
      await Promise.all(redirects.map(async ({ from, to }) => {
        const directory = path.join(dist, from.replace(/^\//, ""));
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, "index.html"), `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${SITE_URL}${to}"><meta http-equiv="refresh" content="0;url=${to}"><title>Đang chuyển hướng | Đội Hình Sân Cỏ</title></head><body><p>Trang đã chuyển tới <a href="${to}">${SITE_URL}${to}</a>.</p></body></html>`, "utf8");
      }));
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const skipPrerender = mode === "vercel";
  const contentfulRoutes = command === "build" && !skipPrerender ? await fetchContentfulRoutes(env) : [];
  const routes = [...new Set([...STATIC_ROUTES, ...contentfulRoutes.map(({ slug }) => `/tin-tuc/${slug}`)])];
  const prerenderRoutes = routes.map((route) => route === "/" ? "/__prerender-home" : route);

  return {
    base: "/",
    plugins: [
      react(),
      ...(command === "build" && !skipPrerender ? [
        prerender({
          routes: prerenderRoutes,
          renderer: "@prerenderer/renderer-puppeteer",
          rendererOptions: {
            renderAfterDocumentEvent: "prerender-ready",
            timeout: 30000,
            maxConcurrentRoutes: 2,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          },
          postProcess(renderedRoute) {
            renderedRoute.html = renderedRoute.html
              .replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/gi, SITE_URL)
              .replace("<html lang=\"en\">", "<html lang=\"vi\">");
          },
        }),
        seoFilesPlugin(routes, contentfulRoutes),
      ] : command === "build" && skipPrerender ? [
        seoFilesPlugin(STATIC_ROUTES, []),
      ] : []),
    ],
  };
});
