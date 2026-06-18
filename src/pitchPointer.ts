import type { RefObject } from "react";

export type PitchPointerPosition = {
  isInside: boolean;
  x: number;
  y: number;
};

export const clampPitchCoordinate = (value: number) => Math.min(96, Math.max(4, value));

export const getBoundedPitchPosition = (position: Pick<PitchPointerPosition, "x" | "y">) => ({
  x: clampPitchCoordinate(position.x),
  y: clampPitchCoordinate(position.y),
});

export function getPitchClientPosition(
  pitchRef: RefObject<HTMLDivElement | null>,
  clientX: number,
  clientY: number,
  options: { clamp?: boolean } = {},
): PitchPointerPosition | null {
  const pitch = pitchRef.current;
  if (!pitch) return null;

  const rect = pitch.getBoundingClientRect();
  const styles = window.getComputedStyle(pitch);
  const contentLeft = rect.left + (Number.parseFloat(styles.borderLeftWidth) || 0);
  const contentTop = rect.top + (Number.parseFloat(styles.borderTopWidth) || 0);
  const rawX = ((clientX - contentLeft) / pitch.clientWidth) * 100;
  const rawY = ((clientY - contentTop) / pitch.clientHeight) * 100;
  const shouldClamp = options.clamp ?? true;

  return {
    isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
    x: shouldClamp ? clampPitchCoordinate(rawX) : rawX,
    y: shouldClamp ? clampPitchCoordinate(rawY) : rawY,
  };
}
