import { useEffect, useState } from "react";
import type { NewsArticle } from "../NewsKnowledgePage";

export type ContentfulNode = {
  nodeType?: string;
  value?: string;
  marks?: Array<{ type?: string }>;
  data?: { uri?: string; target?: { sys?: { id?: string } } };
  content?: ContentfulNode[];
};

type ContentfulEntry = {
  sys: { id: string; updatedAt?: string };
  fields?: {
    title?: string;
    slug?: string;
    thumbnail?: { sys?: { id?: string } };
    content?: ContentfulNode;
    publishedDate?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
};

type ContentfulAsset = {
  sys: { id: string };
  fields?: { title?: string; file?: { url?: string } };
};

type ContentfulResponse = {
  items?: ContentfulEntry[];
  includes?: { Asset?: ContentfulAsset[] };
};

export type ContentfulNewsArticle = NewsArticle & {
  id: string;
  publishedDate?: string;
  updatedAt?: string;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  thumbnailSrcSet?: string;
  seoTitle?: string;
  seoDescription?: string;
  richText?: ContentfulNode;
  richTextAssets?: Record<string, { url: string; title: string }>;
};

let articleCache: ContentfulNewsArticle[] | null = null;
let pendingRequest: Promise<ContentfulNewsArticle[]> | null = null;

const collectText = (node?: ContentfulNode): string => {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.content ?? []).map(collectText).join(node.nodeType === "paragraph" ? " " : "");
};

const collectParagraphs = (node?: ContentfulNode): string[] => {
  if (!node) return [];
  const blocks = (node.content ?? [])
    .map((child) => collectText(child).trim())
    .filter(Boolean);
  return blocks.length ? blocks : [collectText(node).trim()].filter(Boolean);
};

const resolveAssetUrl = (url?: string) => {
  if (!url) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
};

export const contentfulImageUrl = (url: string, width: number) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}fm=webp&w=${width}&q=82&fit=fill`;
};

const fetchArticles = async (): Promise<ContentfulNewsArticle[]> => {
  const spaceId = import.meta.env.VITE_CONTENTFUL_SPACE_ID;
  const accessToken = import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN;
  const environment = import.meta.env.VITE_CONTENTFUL_ENVIRONMENT || "master";
  const contentType = import.meta.env.VITE_CONTENTFUL_CONTENT_TYPE || "lineupFootball";
  if (!spaceId || !accessToken) throw new Error("Contentful environment variables are missing");

  const params = new URLSearchParams({
    access_token: accessToken,
    content_type: contentType,
    include: "2",
    limit: "100",
    order: "-fields.publishedDate",
  });
  const response = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries?${params}`,
  );
  if (!response.ok) throw new Error(`Contentful request failed (${response.status})`);

  const payload = (await response.json()) as ContentfulResponse;
  const assets = new Map((payload.includes?.Asset ?? []).map((asset) => [asset.sys.id, asset]));

  return (payload.items ?? []).flatMap((entry) => {
    const fields = entry.fields ?? {};
    const title = fields.title?.trim();
    const slug = fields.slug?.trim();
    const paragraphs = collectParagraphs(fields.content);
    if (!title || !slug || !paragraphs.length) return [];

    const plainText = paragraphs.join(" ");
    const thumbnail = fields.thumbnail?.sys?.id ? assets.get(fields.thumbnail.sys.id) : undefined;
    const readTime = Math.max(1, Math.ceil(plainText.split(/\s+/).filter(Boolean).length / 220));
    const summarySource = fields.excerpt?.trim() || plainText;
    const summary = summarySource.length > 180 ? `${summarySource.slice(0, 177).trimEnd()}...` : summarySource;
    const thumbnailUrl = resolveAssetUrl(thumbnail?.fields?.file?.url);
    const richTextAssets = Object.fromEntries(
      [...assets.entries()].flatMap(([id, asset]) => {
        const url = resolveAssetUrl(asset.fields?.file?.url);
        return url ? [[id, { url, title: asset.fields?.title || title }]] : [];
      }),
    );

    return [{
      id: entry.sys.id,
      slug,
      category: "news" as const,
      readTime,
      title: { vi: title, en: title },
      summary: { vi: summary, en: summary },
      body: { vi: paragraphs, en: paragraphs },
      publishedDate: fields.publishedDate,
      updatedAt: entry.sys.updatedAt,
      thumbnailUrl: thumbnailUrl ? contentfulImageUrl(thumbnailUrl, 1200) : undefined,
      thumbnailSrcSet: thumbnailUrl ? `${contentfulImageUrl(thumbnailUrl, 640)} 640w, ${contentfulImageUrl(thumbnailUrl, 960)} 960w, ${contentfulImageUrl(thumbnailUrl, 1200)} 1200w` : undefined,
      thumbnailAlt: thumbnail?.fields?.title || title,
      seoTitle: fields.seoTitle?.trim(),
      seoDescription: fields.seoDescription?.trim(),
      richText: fields.content,
      richTextAssets,
    }];
  });
};

const loadArticles = () => {
  if (articleCache) return Promise.resolve(articleCache);
  if (!pendingRequest) {
    pendingRequest = fetchArticles()
      .then((articles) => {
        articleCache = articles;
        return articles;
      })
      .finally(() => { pendingRequest = null; });
  }
  return pendingRequest;
};

export function useContentfulNews(fallbackArticles: NewsArticle[]) {
  const [articles, setArticles] = useState<NewsArticle[]>(articleCache?.length ? articleCache : fallbackArticles);
  const [isLoading, setIsLoading] = useState(!articleCache);
  const [isContentful, setIsContentful] = useState(Boolean(articleCache?.length));

  useEffect(() => {
    let active = true;
    loadArticles()
      .then((items) => {
        if (!active || !items.length) return;
        setArticles(items);
        setIsContentful(true);
      })
      .catch((error) => {
        console.error("Unable to load Contentful news", error);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  return { articles, isLoading, isContentful };
}
