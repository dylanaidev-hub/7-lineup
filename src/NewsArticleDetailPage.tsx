import { ArrowLeft, Clock } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import { newsArticles, newsPageCopy } from "./NewsKnowledgePage";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { useContentfulNews, type ContentfulNewsArticle, articlesShareCategory } from "./hooks/useContentfulNews";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import { ContentfulRichText } from "./ContentfulRichText";
import { NewsArticleCard } from "./NewsArticleCard";
import listStyles from "./NewsKnowledgePage.module.css";
import styles from "./NewsArticleDetailPage.module.css";

const detailCopy = {
  vi: { back: "Tin tức & Kiến thức", related: "Có thể bạn quan tâm", content: "Nội dung bài viết" },
  en: { back: "News & Knowledge", related: "You may also like", content: "Article content" },
};

export function NewsArticleDetailPage({ language, slug }: { language: LandingLanguage; slug: string }) {
  const { articles, isLoading } = useContentfulNews(newsArticles);
  const article = articles.find((item) => item.slug === slug);
  usePrerenderReady(!isLoading && Boolean(article));
  if (!article && isLoading) return <main className={styles.page} />;
  if (!article) return <Navigate to="/tin-tuc" replace />;

  const page = newsPageCopy[language];
  const c = detailCopy[language];
  const related = articles
    .filter((item) => item.slug !== slug && articlesShareCategory(article, item))
    .slice(0, 3);
  const cmsArticle = article as ContentfulNewsArticle;
  const title = cmsArticle.seoTitle || article.title[language];
  const description = cmsArticle.seoDescription || article.summary[language];
  const articleUrl = `${seoSiteUrl}/tin-tuc/${article.slug}`;
  const categoryLabel = cmsArticle.categoryLabel || page[article.category];
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Article", headline: article.title[language], description, image: cmsArticle.thumbnailUrl || `${seoSiteUrl}/news-default-thumbnail.webp`, datePublished: cmsArticle.publishedDate, dateModified: cmsArticle.updatedAt, mainEntityOfPage: articleUrl, inLanguage: "vi-VN", publisher: { "@type": "Organization", name: "Đội Hình Sân Cỏ", url: seoSiteUrl } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: seoSiteUrl },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${seoSiteUrl}/tin-tuc` },
      { "@type": "ListItem", position: 3, name: article.title[language], item: articleUrl },
    ] },
  ];

  return (
    <main className={styles.page}>
      <SeoHead title={`${title} | Đội Hình Sân Cỏ`} description={description} path={`/tin-tuc/${article.slug}`} image={cmsArticle.thumbnailUrl || "/news-default-thumbnail.webp"} imageAlt={cmsArticle.thumbnailAlt || article.title[language]} type="article" structuredData={structuredData} />
      <article className={styles.article}>
        <Link className={styles.back} to="/tin-tuc"><ArrowLeft size={17} />{c.back}</Link>
        <div className={styles.meta}>
          <span>{categoryLabel}</span>
          <span><Clock size={15} />{article.readTime} {page.minutes}</span>
        </div>
        <h1>{article.title[language]}</h1>
        <p className={styles.lead}>{article.summary[language]}</p>
        <section aria-labelledby="article-content-title">
          <h2 id="article-content-title" className={styles.srOnly}>{c.content}</h2>
          <div className={styles.content}>
            {cmsArticle.richText ? <ContentfulRichText document={cmsArticle.richText} assets={cmsArticle.richTextAssets} /> : article.body[language].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      </article>

      {related.length ? (
        <section className={styles.related}>
          <h2>{c.related}</h2>
          <div className={listStyles.grid}>
            {related.map((item) => (
              <NewsArticleCard key={item.slug} article={item} language={language} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
