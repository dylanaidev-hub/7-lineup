import type { RefObject } from "react";

export type PitchPointerPosition = {
  isInside: boolean;
  x: number;
  y: number;
};

export type PitchOrientation = "portrait" | "landscape";

export const pitchPointToDisplay = (x: number, y: number, orientation: PitchOrientation) =>
  orientation === "landscape" ? { x: 100 - y, y: x } : { x, y };

export const displayPointToPitch = (x: number, y: number, orientation: PitchOrientation) =>
  orientation === "landscape" ? { x: y, y: 100 - x } : { x, y };

export const clampPitchCoordinate = (value: number) => Math.min(96, Math.max(4, value));

export const getBoundedPitchPosition = (position: Pick<PitchPointerPosition, "x" | "y">) => ({
  x: clampPitchCoordinate(position.x),
  y: clampPitchCoordinate(position.y),
});

const getElementBorderInsets = (element: Element) => {
  const styles = window.getComputedStyle(element);
  return {
    left: Number.parseFloat(styles.borderLeftWidth) || 0,
    top: Number.parseFloat(styles.borderTopWidth) || 0,
  };
};

const getPitchOffsetInRotator = (element: HTMLElement, rotator: HTMLElement) => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;

  while (node && node !== rotator) {
    x += node.offsetLeft;
    y += node.offsetTop;
    const parent: HTMLElement | null = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    if (!parent) return null;
    node = parent;
  }

  return node === rotator ? { x, y } : null;
};

/** Portrait fullscreen rotates the workspace 90°; HTML elements lack getScreenCTM(). */
const clientToPortraitRotatorPercent = (
  element: HTMLElement,
  clientX: number,
  clientY: number,
  contentWidth: number,
  contentHeight: number,
) => {
  const rotator = element.closest(".workspace-fullscreen-portrait-rotator");
  if (!(rotator instanceof HTMLElement) || contentWidth <= 0 || contentHeight <= 0) return null;

  const parent = rotator.parentElement;
  if (!parent) return null;

  const parentRect = parent.getBoundingClientRect();
  const layoutLeft = parentRect.left + parentRect.width / 2;
  const layoutTop = parentRect.top + parentRect.height / 2;
  const originX = rotator.offsetWidth / 2;
  const originY = rotator.offsetHeight / 2;

  const transform = window.getComputedStyle(rotator).transform;
  if (!transform || transform === "none") return null;

  const matrix = new DOMMatrix(transform);
  const local = new DOMPoint(clientX - layoutLeft - originX, clientY - layoutTop - originY).matrixTransform(
    matrix.inverse(),
  );
  const localX = local.x + originX;
  const localY = local.y + originY;

  const pitchOffset = getPitchOffsetInRotator(element, rotator);
  const { left: borderLeft, top: borderTop } = getElementBorderInsets(element);

  if (pitchOffset) {
    return {
      x: ((localX - pitchOffset.x - borderLeft) / contentWidth) * 100,
      y: ((localY - pitchOffset.y - borderTop) / contentHeight) * 100,
    };
  }

  const bounds = element.closest(".pitch-bounds");
  const boundsEl = bounds instanceof HTMLElement ? bounds : rotator;
  const pitchOffsetX = (boundsEl.clientWidth - contentWidth) / 2;
  const pitchOffsetY = (boundsEl.clientHeight - contentHeight) / 2;

  return {
    x: ((localX - pitchOffsetX - borderLeft) / contentWidth) * 100,
    y: ((localY - pitchOffsetY - borderTop) / contentHeight) * 100,
  };
};

type ScreenTransformable = Element & { getScreenCTM?: () => DOMMatrix };

/** Map viewport pointer coords to element-local 0–100% (handles ancestor CSS transforms). */
export const clientToElementPercent = (
  element: Element,
  clientX: number,
  clientY: number,
  contentWidth: number,
  contentHeight: number,
) => {
  if (contentWidth <= 0 || contentHeight <= 0) return null;

  if (element instanceof HTMLElement) {
    const portrait = clientToPortraitRotatorPercent(element, clientX, clientY, contentWidth, contentHeight);
    if (portrait) return portrait;
  }

  const ctm = (element as ScreenTransformable).getScreenCTM?.();
  if (ctm) {
    const { left, top } = getElementBorderInsets(element);
    const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());

    return {
      x: ((local.x - left) / contentWidth) * 100,
      y: ((local.y - top) / contentHeight) * 100,
    };
  }

  return null;
};

export function getPitchClientPosition(
  pitchRef: RefObject<HTMLDivElement | null>,
  clientX: number,
  clientY: number,
  options: { clamp?: boolean } = {},
): PitchPointerPosition | null {
  const pitch = pitchRef.current;
  if (!pitch) return null;

  const transformed = clientToElementPercent(pitch, clientX, clientY, pitch.clientWidth, pitch.clientHeight);
  let rawX: number;
  let rawY: number;

  if (transformed) {
    rawX = transformed.x;
    rawY = transformed.y;
  } else {
    const rect = pitch.getBoundingClientRect();
    const { left, top } = getElementBorderInsets(pitch);
    const contentLeft = rect.left + left;
    const contentTop = rect.top + top;
    rawX = ((clientX - contentLeft) / pitch.clientWidth) * 100;
    rawY = ((clientY - contentTop) / pitch.clientHeight) * 100;
  }

  const orientation: PitchOrientation = pitch.dataset.orientation === "landscape" ? "landscape" : "portrait";
  const position = displayPointToPitch(rawX, rawY, orientation);
  const shouldClamp = options.clamp ?? true;

  return {
    isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
    x: shouldClamp ? clampPitchCoordinate(position.x) : position.x,
    y: shouldClamp ? clampPitchCoordinate(position.y) : position.y,
  };
}
