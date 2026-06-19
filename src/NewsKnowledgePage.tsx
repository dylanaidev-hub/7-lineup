import { BookOpenText } from "@phosphor-icons/react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { SiteIcon } from "./SiteIcon";
import { useContentfulNews, type ContentfulNewsArticle, articleMatchesCategory, type NewsCategoryOption } from "./hooks/useContentfulNews";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import { NewsArticleCard } from "./NewsArticleCard";
import styles from "./NewsKnowledgePage.module.css";

type Category = "all" | "tactics" | "skills" | "team" | "news";
export type NewsArticle = {
  slug: string;
  category: Exclude<Category, "all">;
  readTime: number;
  title: Record<LandingLanguage, string>;
  summary: Record<LandingLanguage, string>;
  body: Record<LandingLanguage, string[]>;
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "nguyen-tac-doi-hinh-san-7",
    category: "tactics",
    readTime: 6,
    title: { vi: "Ba nguyên tắc giữ cự ly đội hình sân 7", en: "Three spacing principles for 7-a-side football" },
    summary: { vi: "Giữ đội hình đủ gần để hỗ trợ, đủ rộng để thoát pressing và luôn có lớp bọc lót.", en: "Stay close enough to support, wide enough to escape pressure, and always keep defensive cover." },
    body: {
      vi: ["Cự ly tốt giúp đội bóng di chuyển như một khối thay vì bảy cá nhân riêng lẻ. Khi có bóng, hãy tạo tam giác chuyền ở khu vực gần bóng và giữ ít nhất một cầu thủ làm điểm cân bằng phía sau.", "Khi mất bóng, ưu tiên thu hẹp chiều ngang trước khi lao vào tranh chấp. Khoảng cách giữa các tuyến nên đủ ngắn để cầu thủ thứ hai có thể bọc lót ngay khi người đầu tiên bị vượt qua."],
      en: ["Good spacing helps the team move as one unit instead of seven separate players. In possession, create passing triangles around the ball and keep at least one player behind it for balance.", "After losing possession, narrow the pitch before diving into a challenge. Lines should remain close enough for the second defender to cover immediately."],
    },
  },
  {
    slug: "xay-dung-2-3-1",
    category: "tactics",
    readTime: 5,
    title: { vi: "Cách vận hành sơ đồ 2-3-1 hiệu quả", en: "How to make the 2-3-1 formation work" },
    summary: { vi: "Vai trò của hai hậu vệ, bộ ba tuyến giữa và cách hỗ trợ tiền đạo cắm.", en: "The roles of two defenders, the midfield three, and support for the lone striker." },
    body: { vi: ["Sơ đồ 2-3-1 tạo chiều rộng tự nhiên nhưng đòi hỏi hai cầu thủ biên có thể lên xuống liên tục.", "Khi một biên dâng cao, biên đối diện nên bó vào trong còn tiền vệ trung tâm giữ vị trí để đội không bị phản công trực diện."], en: ["The 2-3-1 provides natural width but asks both wide players to cover plenty of ground.", "When one flank advances, the opposite wide player should tuck inside while the central midfielder protects against direct counterattacks."] },
  },
  {
    slug: "thoat-pressing-san-nho",
    category: "skills",
    readTime: 4,
    title: { vi: "Thoát pressing trên sân nhỏ bằng hai chạm", en: "Escaping pressure with two-touch football" },
    summary: { vi: "Quan sát trước khi nhận bóng, mở thân người và chọn đường chuyền tiếp theo.", en: "Scan before receiving, open your body, and prepare the next pass." },
    body: { vi: ["Kỹ thuật quan trọng nhất không nằm ở cú chạm đầu tiên mà ở việc quan sát trước khi bóng đến.", "Hãy nhận bóng bằng chân xa đối thủ, mở thân người về phía khoảng trống và ưu tiên đường chuyền giúp đồng đội tiến lên."], en: ["The key action happens before the first touch: scan while the ball is travelling.", "Receive with the foot furthest from pressure, open toward space, and choose passes that help the next player move forward."] },
  },
  {
    slug: "phong-ngu-1v1",
    category: "skills",
    readTime: 4,
    title: { vi: "Phòng ngự 1 đối 1: chậm lại để thắng", en: "One-on-one defending: slow down to win" },
    summary: { vi: "Không lao vào quá sớm, khóa hướng thuận lợi và chờ thời điểm tranh bóng.", en: "Avoid diving in, close the preferred route, and wait for the right moment." },
    body: { vi: ["Mục tiêu đầu tiên của người phòng ngự là làm chậm đối thủ, không phải cướp bóng ngay lập tức.", "Giữ trọng tâm thấp, đứng chếch để ép đối thủ về biên và chỉ tranh bóng khi họ có một nhịp chạm dài."], en: ["A defender's first goal is to delay, not to win the ball immediately.", "Stay low, angle your body to show the attacker outside, and challenge after a heavy touch."] },
  },
  {
    slug: "checklist-truoc-tran",
    category: "team",
    readTime: 3,
    title: { vi: "Checklist 15 phút trước trận", en: "The 15-minute pre-match checklist" },
    summary: { vi: "Chốt nhân sự, vai trò, tình huống cố định và một thông điệp chiến thuật duy nhất.", en: "Confirm players, roles, set pieces, and one clear tactical message." },
    body: { vi: ["Một buổi họp ngắn hiệu quả chỉ cần trả lời bốn câu hỏi: ai đá chính, ai thay vị trí nào, đội triển khai bóng ra sao và phản ứng thế nào khi mất bóng.", "Kết thúc bằng một tình huống cố định tấn công và phòng ngự. Thông điệp càng ngắn, khả năng cầu thủ thực hiện đúng càng cao."], en: ["A useful short team talk answers four questions: who starts, who covers each role, how the team builds up, and what happens after losing the ball.", "Finish with one attacking and one defensive set-piece reminder. The shorter the message, the more likely players are to execute it."] },
  },
  {
    slug: "phan-vai-doi-truong",
    category: "team",
    readTime: 5,
    title: { vi: "Phân vai để đội bóng phong trào vận hành nhẹ nhàng", en: "Simple roles that keep an amateur team organised" },
    summary: { vi: "Chia rõ người quản lý đội, chiến thuật, quỹ và truyền thông để không ai bị quá tải.", en: "Separate team, tactics, finance, and communication duties so nobody carries everything." },
    body: { vi: ["Một đội bóng ổn định không nhất thiết cần bộ máy lớn, nhưng cần trách nhiệm rõ ràng.", "Hãy chỉ định một người chốt danh sách, một người quản lý sân và quỹ, cùng một người phụ trách chuyên môn. Các quyết định quan trọng nên được ghi lại ở một nơi chung."], en: ["A stable amateur team does not need a large organisation, but it does need clear ownership.", "Assign one person to confirm availability, one to manage venue and money, and one to lead football decisions. Record important decisions in one shared place."] },
  },
];

const ARTICLES_PER_PAGE = 6;

export const newsPageCopy = {
  vi: { eyebrow: "Góc chiến thuật sân cỏ", title: "Tin tức & Kiến thức", intro: "Ý tưởng thực tế giúp đội bóng tổ chức tốt hơn, chơi thông minh hơn và chuẩn bị nhanh hơn cho ngày ra sân.", search: "Tìm bài viết...", empty: "Không tìm thấy bài viết phù hợp.", featured: "Bài nổi bật", read: "Đọc bài", minutes: "phút đọc", all: "Tất cả", tactics: "Chiến thuật", skills: "Kỹ năng", team: "Quản lý đội", news: "Tin tức", more: "Các bài viết khác", pagePrev: "Trước", pageNext: "Sau", pageLabel: (current: number, total: number) => `Trang ${current} / ${total}` },
  en: { eyebrow: "Football learning hub", title: "News & Knowledge", intro: "Practical ideas to help teams organise better, play smarter, and prepare faster for match day.", search: "Search articles...", empty: "No matching articles found.", featured: "Featured", read: "Read article", minutes: "min read", all: "All", tactics: "Tactics", skills: "Skills", team: "Team management", news: "News", more: "More articles", pagePrev: "Previous", pageNext: "Next", pageLabel: (current: number, total: number) => `Page ${current} of ${total}` },
};

type LegacyCategory = Exclude<Category, "all">;

const FALLBACK_FILTER_OPTIONS: Array<{ slug: LegacyCategory; title: Record<LandingLanguage, string> }> = [
  { slug: "tactics", title: { vi: "Chiến thuật", en: "Tactics" } },
  { slug: "skills", title: { vi: "Kỹ năng", en: "Skills" } },
  { slug: "team", title: { vi: "Quản lý đội", en: "Team management" } },
  { slug: "news", title: { vi: "Tin tức", en: "News" } },
];

function isFeaturedArticle(article: NewsArticle | ContentfulNewsArticle) {
  return Boolean((article as ContentfulNewsArticle).isFeatured);
}

export function NewsKnowledgePage({ language }: { language: LandingLanguage }) {
  const navigate = useNavigate();
  const libraryRef = useRef<HTMLElement>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { articles, categories, isContentful, isLoading } = useContentfulNews(newsArticles);
  usePrerenderReady(!isLoading);
  const c = newsPageCopy[language];
  const filterOptions: Array<NewsCategoryOption | { slug: LegacyCategory; title: string }> = isContentful
    ? categories
    : FALLBACK_FILTER_OPTIONS.map((option) => ({ slug: option.slug, title: option.title[language] }));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    return articles.filter((article) => {
      const matchesCategory = category === "all" || articleMatchesCategory(article, category);
      const matchesQuery = !normalized || `${article.title[language]} ${article.summary[language]}`.toLocaleLowerCase(language).includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [articles, category, language, query]);

  const featuredArticle = articles.find((article) => isFeaturedArticle(article));
  const featuredCms = featuredArticle as ContentfulNewsArticle | undefined;
  const isBrowsing = category !== "all" || Boolean(query.trim());
  const listArticles = isBrowsing
    ? filtered
    : filtered.filter((article) => !isFeaturedArticle(article));

  const totalPages = Math.max(1, Math.ceil(listArticles.length / ARTICLES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedArticles = listArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE,
  );
  const showPagination = listArticles.length > ARTICLES_PER_PAGE;

  useEffect(() => {
    setPage(1);
  }, [category, query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openArticle = (slug: string) => navigate(`/tin-tuc/${slug}`);

  return (
    <main className={styles.page}>
      <SeoHead
        title="Tin tức và kiến thức bóng đá phong trào | Đội Hình Sân Cỏ"
        description="Kiến thức chiến thuật, kỹ năng và kinh nghiệm tổ chức đội bóng sân 5, sân 7, sân 11 dành cho cộng đồng bóng đá phong trào."
        path="/tin-tuc"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Tin tức và kiến thức bóng đá phong trào",
          url: `${seoSiteUrl}/tin-tuc`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: articles.map((article, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: article.title.vi,
              url: `${seoSiteUrl}/tin-tuc/${article.slug}`,
            })),
          },
        }}
      />
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className={styles.intro}>{c.intro}</p>
        </div>
        <SiteIcon icon={BookOpenText} variant="spotlight" size={72} />
      </section>

      <section className={styles.controls} aria-label="Article filters">
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} />
        </label>
        <div className={styles.filters}>
          <button key="all" type="button" className={category === "all" ? styles.filterActive : ""} onClick={() => setCategory("all")}>{c.all}</button>
          {filterOptions.map((option) => (
            <button
              key={option.slug}
              type="button"
              className={category === option.slug ? styles.filterActive : ""}
              onClick={() => setCategory(option.slug)}
            >
              {option.title}
            </button>
          ))}
        </div>
      </section>

      {featuredArticle && !isBrowsing ? <section className={styles.featured}>
        <img src={featuredCms?.thumbnailUrl || "/news-default-thumbnail.webp"} srcSet={featuredCms?.thumbnailSrcSet} sizes="(max-width: 820px) 100vw, 65vw" alt={featuredCms?.thumbnailAlt || "Tin tức Đội Hình Sân Cỏ"} width="1200" height="675" fetchPriority="high" />
        <div className={styles.featuredContent}>
          <span className={styles.label}>{c.featured}</span>
          <h2>{featuredArticle.title[language]}</h2>
          <p>{featuredArticle.summary[language]}</p>
          <span className={styles.meta}><Clock size={15} /> {featuredArticle.readTime} {c.minutes}</span>
          <button type="button" onClick={() => openArticle(featuredArticle.slug)}>{c.read}<ArrowRight size={17} /></button>
        </div>
      </section> : null}

      {isBrowsing || listArticles.length ? <section ref={libraryRef} className={styles.library}>
        <h2>{c.more}</h2>
        {listArticles.length ? (
          <>
          <div className={styles.grid}>
            {paginatedArticles.map((article) => (
              <NewsArticleCard key={article.slug} article={article} language={language} />
            ))}
          </div>
          {showPagination ? (
            <nav className={styles.pagination} aria-label={language === "vi" ? "Phân trang bài viết" : "Article pagination"}>
              <button
                type="button"
                className={styles.pageNav}
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                {c.pagePrev}
              </button>
              <div className={styles.pageNumbers}>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={pageNumber === currentPage ? styles.pageActive : styles.pageNumber}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    onClick={() => goToPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <span className={styles.pageStatus}>{c.pageLabel(currentPage, totalPages)}</span>
              <button
                type="button"
                className={styles.pageNav}
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                {c.pageNext}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
          </>
        ) : <p className={styles.empty}>{c.empty}</p>}
      </section> : null}

    </main>
  );
}
