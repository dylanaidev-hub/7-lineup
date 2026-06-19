import styles from "./HeroAnimatedTitle.module.css";

type HeroAnimatedTitleProps = {
  title: string;
  className?: string;
  gradient?: boolean;
};

export function HeroAnimatedTitle({ title, className, gradient = false }: HeroAnimatedTitleProps) {
  const words = title.split(/\s+/).filter(Boolean);

  return (
    <h1 className={className} aria-label={title}>
      {words.map((word, index) => (
        <span key={`${index}-${word}`}>
          {index > 0 ? " " : null}
          <span
            className={`${styles.word} ${gradient ? styles.wordGradient : ""}`}
            style={{ animationDelay: `${0.1 + index * 0.07}s` }}
          >
            {word}
          </span>
        </span>
      ))}
    </h1>
  );
}
