import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import { newsPageCopy, type NewsArticle } from "./NewsKnowledgePage";
import type { ContentfulNewsArticle } from "./hooks/useContentfulNews";
import styles from "./NewsKnowledgePage.module.css";

const DEFAULT_NEWS_THUMBNAIL = "/news-default-thumbnail.webp";

function getCardThumbnail(article: NewsArticle | ContentfulNewsArticle) {
  const cmsArticle = article as ContentfulNewsArticle;
  if (!cmsArticle.thumbnailUrl) return DEFAULT_NEWS_THUMBNAIL;
  return cmsArticle.thumbnailUrl.replace("w=1200", "w=640");
}

function getArticleCategoryLabel(article: NewsArticle | ContentfulNewsArticle, language: LandingLanguage) {
  const cmsArticle = article as ContentfulNewsArticle;
  if (cmsArticle.categoryLabel) return cmsArticle.categoryLabel;
  return newsPageCopy[language][article.category];
}

export function NewsArticleCard({ article, language }: { article: NewsArticle | ContentfulNewsArticle; language: LandingLanguage }) {
  const navigate = useNavigate();
  const c = newsPageCopy[language];
  const cmsArticle = article as ContentfulNewsArticle;

  return (
    <article className={styles.card}>
      <div className={styles.cardMedia}>
        <img
          src={getCardThumbnail(article)}
          srcSet={cmsArticle.thumbnailSrcSet}
          sizes="(max-width: 560px) 100vw, (max-width: 820px) 50vw, 33vw"
          alt={cmsArticle.thumbnailAlt || article.title[language]}
          loading="lazy"
          width={640}
          height={360}
        />
        <span className={styles.cardCategory}>{getArticleCategoryLabel(article, language)}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{article.readTime} {c.minutes}</span>
        </div>
        <h3>{article.title[language]}</h3>
        <p>{article.summary[language]}</p>
        <button type="button" onClick={() => navigate(`/tin-tuc/${article.slug}`)}>
          {c.read}
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
