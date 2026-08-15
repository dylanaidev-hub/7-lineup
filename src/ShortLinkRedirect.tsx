import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { useLanguage } from "./LanguageContext";
import { isPitchSize, type PitchSize } from "./appRouting";
import { formationsBySize, isFormationKey } from "./formationPresets";
import type { FormationKey } from "./formationTypes";
import { buildLineupUrlFromPayload, resolveShortShareLink } from "./shareLinks";

const copy = {
  vi: {
    loading: "Đang mở đội hình...",
    expiredTitle: "Liên kết không còn khả dụng",
    expiredBody: "Liên kết chia sẻ đã hết hạn hoặc không tồn tại. Liên kết chia sẻ có hiệu lực trong 7 ngày.",
    action: "Tạo đội hình mới",
  },
  en: {
    loading: "Opening lineup...",
    expiredTitle: "This link is no longer available",
    expiredBody: "The share link has expired or does not exist. Share links stay valid for 7 days.",
    action: "Create a new lineup",
  },
} as const;

const validators = {
  isPitchSize,
  isFormationKey,
  hasFormation: (pitchSize: PitchSize, formation: FormationKey) => Boolean(formationsBySize[pitchSize][formation]),
};

export default function ShortLinkRedirect() {
  const { code } = useParams();
  const { language } = useLanguage();
  const [expired, setExpired] = useState(false);
  const text = copy[language];

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const payload = code ? await resolveShortShareLink<FormationKey>(code, validators) : null;
      if (cancelled) return;

      if (!payload) {
        setExpired(true);
        return;
      }

      window.location.replace(buildLineupUrlFromPayload(payload, window.location.origin).toString());
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!expired) return <AppLoadingScreen message={text.loading} />;

  return (
    <main className="short-link-fallback">
      <h1>{text.expiredTitle}</h1>
      <p>{text.expiredBody}</p>
      <a href="/app/lineup?pitch=7">{text.action}</a>
    </main>
  );
}
