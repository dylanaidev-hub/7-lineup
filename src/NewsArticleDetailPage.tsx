import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import { newsArticles, newsPageCopy } from "./NewsKnowledgePage";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { useContentfulNews, type ContentfulNewsArticle } from "./hooks/useContentfulNews";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import { ContentfulRichText } from "./ContentfulRichText";
import styles from "./NewsArticleDetailPage.module.css";

const detailCopy = {
  vi: { back: "Tin tức & Kiến thức", related: "Có thể bạn quan tâm", read: "Đọc tiếp" },
  en: { back: "News & Knowledge", related: "You may also like", read: "Read next" },
};

export function NewsArticleDetailPage({ language, slug }: { language: LandingLanguage; slug: string }) {
  const { articles, isLoading } = useContentfulNews(newsArticles);
  const article = articles.find((item) => item.slug === slug);
  usePrerenderReady(!isLoading && Boolean(article));
  if (!article && isLoading) return <main className={styles.page} />;
  if (!article) return <Navigate to="/tin-tuc" replace />;

  const page = newsPageCopy[language];
  const c = detailCopy[language];
  const related = articles.filter((item) => item.slug !== slug).slice(0, 3);
  const cmsArticle = article as ContentfulNewsArticle;
  const title = cmsArticle.seoTitle || article.title[language];
  const description = cmsArticle.seoDescription || article.summary[language];
  const articleUrl = `${seoSiteUrl}/tin-tuc/${article.slug}`;
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
          <span>{page[article.category]}</span>
          <span><Clock size={15} />{article.readTime} {page.minutes}</span>
        </div>
        <h1>{article.title[language]}</h1>
        <p className={styles.lead}>{article.summary[language]}</p>
        <img className={styles.cover} src={cmsArticle.thumbnailUrl || "/news-default-thumbnail.webp"} srcSet={cmsArticle.thumbnailSrcSet} sizes="(max-width: 900px) 100vw, 860px" alt={cmsArticle.thumbnailAlt || "Tin tức Đội Hình Sân Cỏ"} width="1200" height="675" fetchPriority="high" />
        <div className={styles.content}>
          {cmsArticle.richText ? <ContentfulRichText document={cmsArticle.richText} assets={cmsArticle.richTextAssets} /> : article.body[language].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>

      <section className={styles.related}>
        <h2>{c.related}</h2>
        <div className={styles.relatedGrid}>
          {related.map((item) => (
            <Link key={item.slug} to={`/tin-tuc/${item.slug}`} className={styles.relatedCard}>
              <span>{page[item.category]} · {item.readTime} {page.minutes}</span>
              <h3>{item.title[language]}</h3>
              <span className={styles.readMore}>{c.read}<ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
