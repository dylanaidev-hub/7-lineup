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
    category?: Array<{ sys?: { id?: string } }>;
  };
};

type ContentfulCategoryEntry = {
  sys: { id: string; contentType?: { sys?: { id?: string } } };
  fields?: { title?: string; slug?: string };
};

type ContentfulAsset = {
  sys: { id: string };
  fields?: { title?: string; file?: { url?: string } };
};

type ContentfulResponse = {
  items?: ContentfulEntry[];
  includes?: { Asset?: ContentfulAsset[]; Entry?: ContentfulCategoryEntry[] };
};

export type NewsCategoryOption = {
  id: string;
  slug: string;
  title: string;
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
  isFeatured?: boolean;
  categoryLabel?: string;
  categorySlugs?: string[];
};

type ContentfulNewsPayload = {
  articles: ContentfulNewsArticle[];
  categories: NewsCategoryOption[];
};

let contentCache: ContentfulNewsPayload | null = null;
let pendingRequest: Promise<ContentfulNewsPayload> | null = null;

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

export const normalizeCategorySlug = (value: string) => value.trim().toLocaleLowerCase("vi");

const FEATURED_CATEGORY_SLUGS = new Set(["bai-noi-bat", "featured"]);
const FEATURED_CATEGORY_TITLES = new Set(["bài nổi bật", "featured"]);

export const isFeaturedCategory = (category?: { title?: string; slug?: string }) => {
  const slug = category?.slug ? normalizeCategorySlug(category.slug) : "";
  const title = category?.title?.trim().toLocaleLowerCase("vi");
  return Boolean((slug && FEATURED_CATEGORY_SLUGS.has(slug)) || (title && FEATURED_CATEGORY_TITLES.has(title)));
};

const getContentfulConfig = () => {
  const spaceId = import.meta.env.VITE_CONTENTFUL_SPACE_ID;
  const accessToken = import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN;
  const environment = import.meta.env.VITE_CONTENTFUL_ENVIRONMENT || "master";
  const contentType = import.meta.env.VITE_CONTENTFUL_CONTENT_TYPE || "lineupFootball";
  if (!spaceId || !accessToken) throw new Error("Contentful environment variables are missing");
  return { spaceId, accessToken, environment, contentType };
};

const fetchCategories = async (): Promise<NewsCategoryOption[]> => {
  const { spaceId, accessToken, environment } = getContentfulConfig();
  const params = new URLSearchParams({
    access_token: accessToken,
    content_type: "category",
    limit: "100",
    order: "fields.title",
  });
  const response = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}/entries?${params}`,
  );
  if (!response.ok) throw new Error(`Contentful category request failed (${response.status})`);

  const payload = (await response.json()) as ContentfulResponse;
  return (payload.items ?? []).flatMap((entry) => {
    const title = entry.fields?.title?.trim();
    const slug = entry.fields?.slug?.trim();
    if (!title || !slug || isFeaturedCategory({ title, slug })) return [];
    return [{
      id: entry.sys.id,
      slug: normalizeCategorySlug(slug),
      title,
    }];
  });
};

const fetchArticles = async (): Promise<ContentfulNewsArticle[]> => {
  const { spaceId, accessToken, environment, contentType } = getContentfulConfig();
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
  const categories = new Map(
    (payload.includes?.Entry ?? [])
      .filter((entry) => entry.sys.contentType?.sys?.id === "category")
      .map((entry) => [entry.sys.id, entry]),
  );

  return (payload.items ?? []).flatMap((entry) => {
    const fields = entry.fields ?? {};
    const title = fields.title?.trim();
    const slug = fields.slug?.trim();
    const paragraphs = collectParagraphs(fields.content);
    if (!title || !slug || !paragraphs.length) return [];

    const linkedCategories = (fields.category ?? []).flatMap((ref) => {
      const categoryEntry = ref.sys?.id ? categories.get(ref.sys.id) : undefined;
      return categoryEntry?.fields ? [categoryEntry.fields] : [];
    });
    const browsableCategories = linkedCategories.filter((category) => !isFeaturedCategory(category));
    const isFeatured = linkedCategories.some((category) => isFeaturedCategory(category));
    const primaryCategory = browsableCategories[0];
    const categorySlugs = browsableCategories.flatMap((category) => {
      const normalizedSlug = category.slug ? normalizeCategorySlug(category.slug) : "";
      return normalizedSlug ? [normalizedSlug] : [];
    });
    const categoryLabel = primaryCategory?.title?.trim() || "Tin tức";

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
      category: "news",
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
      isFeatured,
      categoryLabel,
      categorySlugs,
    }];
  });
};

const loadContent = () => {
  if (contentCache) return Promise.resolve(contentCache);
  if (!pendingRequest) {
    pendingRequest = Promise.all([fetchArticles(), fetchCategories()])
      .then(([articles, categories]) => {
        contentCache = { articles, categories };
        return contentCache;
      })
      .finally(() => { pendingRequest = null; });
  }
  return pendingRequest;
};

export function articleMatchesCategory(article: NewsArticle | ContentfulNewsArticle, categorySlug: string) {
  const normalized = normalizeCategorySlug(categorySlug);
  const cmsArticle = article as ContentfulNewsArticle;
  if (cmsArticle.categorySlugs?.length) {
    return cmsArticle.categorySlugs.includes(normalized);
  }
  return article.category === categorySlug;
}

export function articlesShareCategory(
  left: NewsArticle | ContentfulNewsArticle,
  right: NewsArticle | ContentfulNewsArticle,
) {
  const leftCms = left as ContentfulNewsArticle;
  const rightCms = right as ContentfulNewsArticle;
  if (leftCms.categorySlugs?.length && rightCms.categorySlugs?.length) {
    return leftCms.categorySlugs.some((slug) => rightCms.categorySlugs!.includes(slug));
  }
  return left.category === right.category;
}

export function useContentfulNews(fallbackArticles: NewsArticle[]) {
  const [articles, setArticles] = useState<NewsArticle[]>(contentCache?.articles.length ? contentCache.articles : fallbackArticles);
  const [categories, setCategories] = useState<NewsCategoryOption[]>(contentCache?.categories ?? []);
  const [isLoading, setIsLoading] = useState(!contentCache);
  const [isContentful, setIsContentful] = useState(Boolean(contentCache?.articles.length));

  useEffect(() => {
    let active = true;
    loadContent()
      .then(({ articles: items, categories: nextCategories }) => {
        if (!active || !items.length) return;
        setArticles(items);
        setCategories(nextCategories);
        setIsContentful(true);
      })
      .catch((error) => {
        console.error("Unable to load Contentful news", error);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  return { articles, categories, isLoading, isContentful };
}
