import { Helmet } from "react-helmet-async";

const SITE_URL = "https://doihinhsanco.pro.vn";
const DEFAULT_IMAGE = `${SITE_URL}/thumbnail-doihinhsanco.png`;

type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  robots?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  imageAlt = title,
  type = "website",
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  structuredData,
}: SeoHeadProps) {
  const canonical = `${SITE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <Helmet htmlAttributes={{ lang: "vi" }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:locale" content="vi_VN" />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Đội Hình Sân Cỏ" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      {structuredData ? (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      ) : null}
    </Helmet>
  );
}

export const seoSiteUrl = SITE_URL;
