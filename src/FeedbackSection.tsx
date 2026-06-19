import { PaperPlaneTilt } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import type { LandingLanguage } from "./LandingPage";
import styles from "./FeedbackSection.module.css";

const FEEDBACK_EMAIL = "dylan.aidev@gmail.com";

const copy = {
  vi: {
    feedbackEyebrow: "Góp ý & phản hồi",
    feedbackTitle: "Giúp chúng tôi làm tốt hơn mỗi ngày",
    feedbackDescription:
      "Bạn gặp lỗi, có ý tưởng tính năng hoặc muốn chia sẻ trải nghiệm? Gửi tin nhắn — chúng tôi đọc từng góp ý.",
    feedbackEmail: "Email của bạn (tuỳ chọn)",
    feedbackMessage: "Nội dung góp ý",
    feedbackSubmit: "Gửi góp ý",
    feedbackSending: "Đang gửi...",
    feedbackSuccess: "Cảm ơn bạn! Góp ý đã được gửi.",
    feedbackError: "Không gửi được. Vui lòng thử lại sau.",
    feedbackRequired: "Vui lòng nhập nội dung góp ý.",
  },
  en: {
    feedbackEyebrow: "Feedback",
    feedbackTitle: "Help us improve every day",
    feedbackDescription:
      "Found a bug, have a feature idea, or want to share your experience? Send us a message — we read every note.",
    feedbackEmail: "Your email (optional)",
    feedbackMessage: "Your feedback",
    feedbackSubmit: "Send feedback",
    feedbackSending: "Sending...",
    feedbackSuccess: "Thank you! Your feedback has been sent.",
    feedbackError: "Could not send. Please try again later.",
    feedbackRequired: "Please enter your feedback.",
  },
};

type FeedbackStatus = "idle" | "sending" | "success" | "error";

export function FeedbackSection({ language }: { language: LandingLanguage }) {
  const c = copy[language];
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = feedbackMessage.trim();
    if (!message) {
      setFeedbackStatus("error");
      return;
    }

    setFeedbackStatus("sending");
    const replyEmail = feedbackEmail.trim();

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${FEEDBACK_EMAIL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: language === "vi" ? "Góp ý từ DOIHINHSANCO" : "Feedback from DOIHINHSANCO",
          _template: "table",
          _captcha: "false",
          message,
          email: replyEmail || "anonymous@doihinhsanco.local",
          _replyto: replyEmail || undefined,
        }),
      });

      if (!response.ok) throw new Error("submit failed");

      setFeedbackStatus("success");
      setFeedbackEmail("");
      setFeedbackMessage("");
    } catch {
      setFeedbackStatus("error");
    }
  };

  return (
    <section className={styles.feedback} aria-labelledby="feedback-section-title">
      <div className={styles.feedbackIntro}>
        <p className={styles.feedbackEyebrow}>{c.feedbackEyebrow}</p>
        <h2 id="feedback-section-title">{c.feedbackTitle}</h2>
        <p className={styles.feedbackDescription}>{c.feedbackDescription}</p>
      </div>
      <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
        <input
          type="email"
          value={feedbackEmail}
          onChange={(event) => {
            setFeedbackEmail(event.target.value);
            if (feedbackStatus === "error") setFeedbackStatus("idle");
          }}
          placeholder={c.feedbackEmail}
          autoComplete="email"
        />
        <textarea
          value={feedbackMessage}
          onChange={(event) => {
            setFeedbackMessage(event.target.value);
            if (feedbackStatus === "error") setFeedbackStatus("idle");
          }}
          placeholder={c.feedbackMessage}
          rows={6}
          required
        />
        <div className={styles.feedbackActions}>
          <button type="submit" disabled={feedbackStatus === "sending"}>
            <PaperPlaneTilt size={16} weight="fill" aria-hidden="true" />
            {feedbackStatus === "sending" ? c.feedbackSending : c.feedbackSubmit}
          </button>
          {feedbackStatus === "success" ? (
            <p className={styles.feedbackSuccess} role="status">{c.feedbackSuccess}</p>
          ) : null}
          {feedbackStatus === "error" ? (
            <p className={styles.feedbackError} role="alert">
              {!feedbackMessage.trim() ? c.feedbackRequired : c.feedbackError}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
