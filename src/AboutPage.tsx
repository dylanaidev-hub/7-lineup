import { ArrowRight, ClipboardCheck, Share2, Smartphone, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import styles from "./AboutPage.module.css";

const description =
  "Đội Hình Sân Cỏ giúp đội bóng phong trào xếp đội hình, diễn đạt chiến thuật và chia sẻ kế hoạch thi đấu rõ ràng hơn.";

const principles = [
  {
    icon: Smartphone,
    title: "Nhanh trước giờ bóng lăn",
    body: "Mọi thao tác cốt lõi phải dùng tốt ngay trên điện thoại, kể cả khi đội hình chỉ được chốt vài phút trước trận.",
  },
  {
    icon: ClipboardCheck,
    title: "Rõ để cả đội cùng hiểu",
    body: "Một sơ đồ trực quan có giá trị hơn nhiều tin nhắn rời rạc. Vị trí, tên cầu thủ và ý đồ chiến thuật cần nằm trong cùng một bối cảnh.",
  },
  {
    icon: Share2,
    title: "Dễ dàng mang vào nhóm chat",
    body: "Kế hoạch chỉ hữu ích khi đồng đội xem được. Vì vậy ảnh và đường link chia sẻ luôn là một phần của quy trình, không phải bước phụ.",
  },
];

export function AboutPage({ onExplore }: { onExplore: () => void }) {
  usePrerenderReady(true);

  return (
    <main className={styles.page}>
      <SeoHead
        title="Về Đội Hình Sân Cỏ | Công cụ chiến thuật bóng đá phong trào"
        description={description}
        path="/ve-chung-toi"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "Về Đội Hình Sân Cỏ",
          description,
          url: `${seoSiteUrl}/ve-chung-toi`,
        }}
      />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Về Đội Hình Sân Cỏ</p>
          <h1>Một cách rõ ràng hơn để cả đội cùng nhìn thấy trận đấu</h1>
          <p>
            Chúng tôi xây dựng công cụ chiến thuật cho bóng đá phong trào: đủ nhanh để dùng trước giờ ra sân,
            đủ trực quan để mọi cầu thủ hiểu cùng một ý tưởng.
          </p>
          <button type="button" onClick={onExplore}>
            Trải nghiệm công cụ <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className={styles.origin}>
        <p className={styles.sectionLabel}>Vấn đề chúng tôi muốn giải quyết</p>
        <div className={styles.originGrid}>
          <h2>Đội hình thường bắt đầu trong nhóm chat, nhưng trận đấu diễn ra trên sân.</h2>
          <div className={styles.originCopy}>
            <p>
              Đội trưởng phải chốt người, đổi vị trí, giải thích cách pressing hoặc một bài phối hợp bằng nhiều
              tin nhắn riêng lẻ. Khi thông tin bị phân tán, mỗi người có thể hình dung một cách khác nhau.
            </p>
            <p>
              Đội Hình Sân Cỏ đưa danh sách cầu thủ, sơ đồ, đối thủ, bóng và hướng di chuyển về cùng một không
              gian. Từ đó, ý tưởng được nhìn thấy trước khi nó được thực hiện trên sân.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.principles}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionLabel}>Nguyên tắc sản phẩm</p>
          <h2>Thiết kế từ nhịp vận hành thực tế của một đội bóng</h2>
        </div>
        <div className={styles.principleList}>
          {principles.map(({ icon: Icon, title, body }, index) => (
            <article key={title}>
              <span className={styles.principleNumber}>0{index + 1}</span>
              <Icon size={25} strokeWidth={1.7} />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.audience}>
        <div className={styles.audienceIcon} aria-hidden="true">
          <Users size={42} strokeWidth={1.5} />
        </div>
        <div>
          <p className={styles.sectionLabel}>Dành cho bóng đá phong trào</p>
          <h2>Cho người đang phải biến một nhóm cầu thủ thành một đội bóng.</h2>
          <p>
            Dù bạn là đội trưởng chốt danh sách, người phụ trách chuyên môn chuẩn bị chiến thuật hay cầu thủ muốn
            chia sẻ một ý tưởng, công cụ được tạo ra để cuộc trao đổi ngắn hơn và trận đấu rõ ràng hơn.
          </p>
        </div>
      </section>

      <section className={styles.closing}>
        <p className={styles.sectionLabel}>Cùng đưa ý tưởng lên sân</p>
        <h2>Bắt đầu bằng một đội hình mà cả đội đều hiểu.</h2>
        <div className={styles.closingActions}>
          <button type="button" onClick={onExplore}>
            Mở không gian chiến thuật <ArrowRight size={18} />
          </button>
          <Link to="/tin-tuc">Đọc kiến thức bóng đá</Link>
        </div>
      </section>
    </main>
  );
}
