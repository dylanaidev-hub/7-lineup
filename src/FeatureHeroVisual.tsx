import type { CSSProperties } from "react";
import type { PublicPageKind } from "./PublicContentPage";
import styles from "./FeatureHeroVisual.module.css";

type FeatureKind = Exclude<PublicPageKind, "about">;

function PitchMarkings() {
  return (
    <div className={styles.pitchMarkings} aria-hidden="true">
      <span className={styles.halfway} />
      <span className={styles.centerCircle} />
      <span className={`${styles.box} ${styles.boxTop}`} />
      <span className={`${styles.box} ${styles.boxBottom}`} />
    </div>
  );
}

function delayStyle(index: number, base = 0.08): CSSProperties {
  return { animationDelay: `${base + index * 0.07}s` };
}

function LineupScene() {
  const players = [
    { x: 50, y: 90, keeper: true },
    { x: 28, y: 68 },
    { x: 50, y: 66 },
    { x: 72, y: 68 },
    { x: 22, y: 44 },
    { x: 50, y: 40, highlight: true },
    { x: 78, y: 44 },
    { x: 50, y: 18 },
  ];
  const opponents = [
    { x: 36, y: 32 },
    { x: 64, y: 32 },
    { x: 50, y: 24 },
  ];

  return (
    <div className={styles.sceneLayer}>
      <svg className={styles.svgLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          className={styles.formationGlow}
          d="M50 90 L28 68 L50 66 L72 68 M22 44 L50 40 L78 44 L50 18"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
        <path
          className={styles.formationLine}
          d="M50 90 L28 68 L50 66 L72 68 M22 44 L50 40 L78 44 L50 18"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
        />
      </svg>
      {players.map((player, index) => (
        <span
          key={`p-${index}`}
          className={`${styles.player} ${player.keeper ? styles.playerKeeper : ""} ${player.highlight ? styles.playerHighlight : ""}`}
          style={{ left: `${player.x}%`, top: `${player.y}%`, ...delayStyle(index, 0.12) }}
        />
      ))}
      {opponents.map((marker, index) => (
        <span
          key={`o-${index}`}
          className={`${styles.player} ${styles.playerOpponent}`}
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, ...delayStyle(index, 0.72) }}
        />
      ))}
      <span className={`${styles.ball} ${styles.ballLineup}`} style={{ left: "50%", top: "40%" }} />
    </div>
  );
}

function TacticsScene() {
  const passLine = "M24 74 Q38 64 52 46";
  const runLine = "M52 46 Q60 38 68 32";

  return (
    <div className={styles.sceneLayer}>
      <span className={styles.player} style={{ left: "24%", top: "74%", ...delayStyle(0, 0.1) }} />
      <span className={styles.player} style={{ left: "52%", top: "46%", ...delayStyle(1, 0.1) }} />
      <span className={styles.player} style={{ left: "68%", top: "32%", ...delayStyle(2, 0.1) }} />
      <span
        className={`${styles.player} ${styles.playerOpponent}`}
        style={{ left: "58%", top: "24%", ...delayStyle(0, 0.45) }}
      />
      <span
        className={`${styles.player} ${styles.playerOpponent}`}
        style={{ left: "74%", top: "20%", ...delayStyle(1, 0.45) }}
      />
      <svg className={styles.svgLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker id="tactics-run-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#facc15" />
          </marker>
        </defs>
        <ellipse className={styles.tacticsZone} cx="62" cy="26" rx="16" ry="10" />
        <path className={styles.tacticsPass} d={passLine} pathLength={1} />
        <path className={styles.tacticsRun} d={runLine} pathLength={1} markerEnd="url(#tactics-run-arrow)" />
      </svg>
    </div>
  );
}

function AnimationScene() {
  const trailPath = "M28 72 Q36 62 44 52 T62 34";
  const frames = [
    { x: 28, y: 72, label: "1" },
    { x: 44, y: 52, label: "2" },
    { x: 62, y: 34, label: "3" },
  ];

  return (
    <div className={styles.sceneLayer}>
      {frames.map((frame) => (
        <span
          key={frame.label}
          className={`${styles.motionFrame} ${
            frame.label === "1"
              ? styles.motionFrame1
              : frame.label === "2"
                ? styles.motionFrame2
                : styles.motionFrame3
          }`}
          style={{ left: `${frame.x}%`, top: `${frame.y}%` }}
        />
      ))}
      <span className={`${styles.player} ${styles.motionPlayer}`} style={{ left: "28%", top: "72%" }} />
      <span className={`${styles.ball} ${styles.motionBall}`} style={{ left: "32%", top: "68%" }} />
      <span
        className={`${styles.player} ${styles.playerOpponent}`}
        style={{ left: "70%", top: "26%", ...delayStyle(0, 0.35) }}
      />
      <span
        className={`${styles.player} ${styles.playerOpponent}`}
        style={{ left: "78%", top: "36%", ...delayStyle(1, 0.35) }}
      />
      {frames.map((frame) => (
        <span
          key={`badge-${frame.label}`}
          className={`${styles.stepBadge} ${
            frame.label === "1" ? styles.motionStep1 : frame.label === "2" ? styles.motionStep2 : styles.motionStep3
          }`}
          style={{ left: `${frame.x - 6}%`, top: `${frame.y + 8}%` }}
        >
          {frame.label}
        </span>
      ))}
      <svg className={styles.svgLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.motionTrail} d={trailPath} pathLength={1} />
      </svg>
    </div>
  );
}

export function FeatureHeroVisual({ kind }: { kind: FeatureKind }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.pitch}>
        <PitchMarkings />
        {kind === "lineup" ? <LineupScene /> : null}
        {kind === "tactics" ? <TacticsScene /> : null}
        {kind === "animation" ? <AnimationScene /> : null}
      </div>
    </div>
  );
}
