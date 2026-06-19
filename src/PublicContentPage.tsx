import { ArrowRight, Check, ClipboardList, PencilRuler, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import styles from "./PublicContentPage.module.css";

export type PublicPageKind = "about" | "lineup" | "tactics";

const content = {
  about: {
    eyebrow: "Về Đội Hình Sân Cỏ",
    title: "Công cụ chiến thuật dành cho bóng đá phong trào",
    description: "Đội Hình Sân Cỏ giúp các đội bóng phong trào xếp đội hình, chuẩn bị chiến thuật và chia sẻ kế hoạch thi đấu dễ dàng hơn.",
    intro: "Chúng tôi xây dựng một không gian làm việc đơn giản để đội trưởng và cầu thủ biến ý tưởng trên sân thành một kế hoạch mà cả đội đều hiểu.",
    sections: [
      ["Xuất phát từ ngày ra sân", "Đội bóng phong trào thường chốt người, đổi vị trí và bàn chiến thuật rất sát giờ. Công cụ được thiết kế để những thao tác đó diễn ra nhanh, rõ và dùng tốt ngay trên điện thoại."],
      ["Một sơ đồ, cả đội cùng hiểu", "Thay vì mô tả dài trong nhóm chat, người dùng có thể kéo cầu thủ vào sân, ghi tên, thêm đối thủ, vẽ hướng di chuyển và gửi lại bằng đường link hoặc hình ảnh."],
      ["Phát triển cùng cộng đồng", "Sản phẩm ưu tiên những nhu cầu thực tế của đội bóng sân 5, sân 7 và sân 11 tại Việt Nam, từ buổi giao lưu hàng tuần đến giải đấu phong trào."],
    ],
    icon: Users,
    path: "/ve-chung-toi",
  },
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
    icon: ClipboardList,
    path: "/tinh-nang/tao-doi-hinh",
  },
  tactics: {
    eyebrow: "Tính năng sa bàn",
    title: "Vẽ sa bàn và mô phỏng chuyển động chiến thuật",
    description: "Vẽ chiến thuật bóng đá, bố trí cầu thủ và đối thủ, tạo từng bước chuyển động rồi phát lại pha phối hợp trên sa bàn trực tuyến.",
    intro: "Từ một tình huống cố định đến cả bài triển khai bóng, sa bàn giúp huấn luyện viên và đội trưởng diễn đạt ý tưởng bằng hình ảnh thay vì lời nói dài dòng.",
    sections: [
      ["Vẽ trực tiếp trên sân", "Dùng nét vẽ tự do để đánh dấu hướng chạy, khu vực pressing hoặc đường chuyền. Undo, redo và xóa nét giúp chỉnh phương án nhanh."],
      ["Player, đối thủ và bóng", "Bố trí đồng thời ba nhóm marker trên cùng một canvas để mô tả đúng bối cảnh của tình huống thi đấu."],
      ["Animation theo từng bước", "Lưu các keyframe, thay đổi nhiều marker và phát lại liên tục để cả đội nhìn thấy thời điểm cùng hướng di chuyển."],
    ],
    icon: PencilRuler,
    path: "/tinh-nang/ve-sa-ban",
  },
} as const;

export function PublicContentPage({ kind, onExplore }: { kind: PublicPageKind; onExplore: () => void }) {
  const page = content[kind];
  const Icon = page.icon;
  usePrerenderReady(true);

  const structuredData = kind === "about"
    ? { "@context": "https://schema.org", "@type": "AboutPage", name: page.title, description: page.description, url: `${seoSiteUrl}${page.path}` }
    : { "@context": "https://schema.org", "@type": "SoftwareApplication", name: page.title, applicationCategory: "SportsApplication", operatingSystem: "Web", description: page.description, url: `${seoSiteUrl}${page.path}`, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } };

  return (
    <main className={styles.page}>
      <SeoHead title={`${page.title} | Đội Hình Sân Cỏ`} description={page.description} path={page.path} structuredData={structuredData} />
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className={styles.intro}>{page.intro}</p>
          <button type="button" onClick={onExplore}>Dùng thử miễn phí <ArrowRight size={18} /></button>
        </div>
        <div className={styles.visual} aria-hidden="true"><Icon size={88} strokeWidth={1.3} /><ShieldCheck size={28} /></div>
      </section>

      <section className={styles.sections}>
        {page.sections.map(([heading, body]) => (
          <article key={heading}>
            <span><Check size={18} /></span>
            <div><h2>{heading}</h2><p>{body}</p></div>
          </article>
        ))}
      </section>

      <section className={styles.cta}>
        <h2>Sẵn sàng đưa ý tưởng lên sân?</h2>
        <p>Tạo sơ đồ đầu tiên ngay trên trình duyệt, không cần cài đặt.</p>
        <button type="button" onClick={onExplore}>Mở không gian chiến thuật <ArrowRight size={18} /></button>
        <Link to="/tin-tuc">Xem kiến thức bóng đá</Link>
      </section>
    </main>
  );
}
