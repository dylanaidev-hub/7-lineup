import { SealCheck } from "@phosphor-icons/react";
import { ArrowRight } from "lucide-react";
import { AboutPage } from "./AboutPage";
import { FeatureHeroVisual } from "./FeatureHeroVisual";
import { HeroAnimatedTitle } from "./HeroAnimatedTitle";
import { SiteIcon } from "./SiteIcon";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import styles from "./PublicContentPage.module.css";

export type PublicPageKind = "about" | "lineup" | "tactics" | "animation";

const content = {
  lineup: {
    eyebrow: "Tính năng đội hình",
    title: "Tạo đội hình bóng đá trực quan trong vài phút",
    description: "Tạo đội hình sân 5, sân 7, sân 11; kéo thả cầu thủ, đặt tên và chia sẻ sơ đồ bóng đá trực tuyến miễn phí.",
    intro: "Chọn số lượng cầu thủ, kéo marker vào vị trí mong muốn và cập nhật tên chính thức hoặc dự bị. Mọi thay đổi được thể hiện trực tiếp trên sân.",
    sections: [
      ["Linh hoạt theo số người", "Bắt đầu với đội hình phổ biến hoặc tự điều chỉnh nhân sự cho buổi đá thực tế. Cầu thủ có thể được kéo vào và ra khỏi sân mà không làm hỏng bố cục."],
      ["Quản lý tên và vai trò", "Mỗi vị trí hỗ trợ cầu thủ đá chính, dự bị và nhãn vị trí rõ ràng để đội trưởng chốt danh sách nhanh hơn."],
      ["Lưu và chia sẻ", "Lưu đội hình vào tài khoản, tải ảnh hoặc gửi link để đồng đội xem đúng trạng thái đã sắp xếp."],
    ],
    path: "/tinh-nang/tao-doi-hinh",
  },
  tactics: {
    eyebrow: "Tính năng sa bàn",
    title: "Vẽ sa bàn chiến thuật trực tiếp trên sân",
    description: "Vẽ chiến thuật bóng đá, bố trí cầu thủ và đối thủ, đánh dấu hướng chạy hoặc đường chuyền trên sa bàn trực tuyến.",
    intro: "Từ một tình huống cố định đến cả bài triển khai bóng, sa bàn giúp huấn luyện viên và đội trưởng diễn đạt ý tưởng bằng hình ảnh thay vì lời nói dài dòng.",
    sections: [
      ["Vẽ trực tiếp trên sân", "Dùng nét vẽ tự do để đánh dấu hướng chạy, khu vực pressing hoặc đường chuyền. Undo, redo và xóa nét giúp chỉnh phương án nhanh."],
      ["Player, đối thủ và bóng", "Bố trí đồng thời ba nhóm marker trên cùng một canvas để mô tả đúng bối cảnh của tình huống thi đấu."],
      ["Chia sẻ phương án", "Tải hình ảnh hoặc gửi đường link để cả đội cùng xem một phương án chiến thuật thống nhất."],
    ],
    path: "/tinh-nang/ve-sa-ban",
  },
  animation: {
    eyebrow: "Tính năng chuyển động",
    title: "Tạo chuyển động chiến thuật theo từng bước",
    description: "Tạo chuỗi di chuyển của cầu thủ, đối thủ và bóng rồi phát lại bài phối hợp bằng animation trực quan.",
    intro: "Chốt từng bước của một pha bóng, thay đổi vị trí marker và phát lại toàn bộ chuỗi để người xem hiểu rõ thời điểm, hướng chạy và cách phối hợp.",
    sections: [
      ["Tạo bài phối hợp từng bước", "Mỗi bước lưu lại toàn bộ vị trí trên sân. Người dùng chỉ cần di chuyển marker rồi bấm Thêm bước để tiếp tục chuỗi."],
      ["Playback rõ ràng", "Phát, dừng hoặc lặp lại animation để phân tích bài chạy nhiều lần mà không phải sắp xếp lại đội hình."],
      ["Giữ đúng bối cảnh trận đấu", "Cầu thủ, đối thủ và bóng cùng chuyển động trên một sân, giúp mô phỏng cả tình huống tấn công lẫn phòng ngự."],
    ],
    path: "/tinh-nang/tao-chuyen-dong",
  },
} as const;

export function PublicContentPage({ kind, onExplore }: { kind: PublicPageKind; onExplore: () => void }) {
  if (kind === "about") return <AboutPage onExplore={onExplore} />;
  return <FeatureContentPage kind={kind} onExplore={onExplore} />;
}

function FeatureContentPage({ kind, onExplore }: { kind: Exclude<PublicPageKind, "about">; onExplore: () => void }) {
  const page = content[kind];
  usePrerenderReady(true);

  const structuredData = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: page.title, applicationCategory: "SportsApplication", operatingSystem: "Web", description: page.description, url: `${seoSiteUrl}${page.path}`, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } };

  return (
    <main className={styles.page}>
      <SeoHead title={`${page.title} | Đội Hình Sân Cỏ`} description={page.description} path={page.path} structuredData={structuredData} />
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{page.eyebrow}</p>
          <HeroAnimatedTitle title={page.title} className={styles.heroTitle} />
          <p className={styles.intro}>{page.intro}</p>
          <button type="button" onClick={onExplore}>Dùng thử miễn phí <ArrowRight size={18} /></button>
        </div>
        <FeatureHeroVisual kind={kind} />
      </section>

      <section className={styles.sections}>
        {page.sections.map(([heading, body]) => (
          <article key={heading}>
            <SiteIcon icon={SealCheck} variant="check" />
            <div><h2>{heading}</h2><p>{body}</p></div>
          </article>
        ))}
      </section>

      <section className={styles.cta}>
        <button type="button" onClick={onExplore}>
          Khám phá
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}
