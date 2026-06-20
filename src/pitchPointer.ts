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

export const isPortraitRotatorActive = (element: Element) =>
  document.body.classList.contains("lineup-portrait-fullscreen")
  || !!element.closest(".workspace-fullscreen-portrait-rotator");

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

/**
 * Map screen coords to rotator-local space.
 * Uses the rotator's visual center (post-transform AABB) so translate(-50%,-50%) rotate(90deg)
 * is accounted for without relying on SVG getScreenCTM (broken on WebKit for CSS ancestors).
 */
const clientToRotatorLocal = (rotator: HTMLElement, clientX: number, clientY: number) => {
  const rect = rotator.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;

  // Inverse of CSS rotate(90deg) about the element center (y-down, clockwise).
  return {
    x: rotator.offsetWidth / 2 + dy,
    y: rotator.offsetHeight / 2 - dx,
  };
};

const clientToPortraitRotatorPercent = (
  pitch: HTMLElement,
  clientX: number,
  clientY: number,
  contentWidth: number,
  contentHeight: number,
) => {
  const rotator = pitch.closest(".workspace-fullscreen-portrait-rotator");
  if (!(rotator instanceof HTMLElement) || contentWidth <= 0 || contentHeight <= 0) return null;

  const { x: localX, y: localY } = clientToRotatorLocal(rotator, clientX, clientY);

  const pitchOffset = getPitchOffsetInRotator(pitch, rotator);
  const { left: borderLeft, top: borderTop } = getElementBorderInsets(pitch);

  if (pitchOffset) {
    return {
      x: ((localX - pitchOffset.x - borderLeft) / contentWidth) * 100,
      y: ((localY - pitchOffset.y - borderTop) / contentHeight) * 100,
    };
  }

  const bounds = pitch.closest(".pitch-bounds");
  const boundsEl = bounds instanceof HTMLElement ? bounds : rotator;
  const pitchOffsetX = (boundsEl.clientWidth - contentWidth) / 2;
  const pitchOffsetY = (boundsEl.clientHeight - contentHeight) / 2;

  return {
    x: ((localX - pitchOffsetX - borderLeft) / contentWidth) * 100,
    y: ((localY - pitchOffsetY - borderTop) / contentHeight) * 100,
  };
};

type ScreenTransformable = Element & { getScreenCTM?: () => DOMMatrix | null };

const resolvePitchElement = (element: Element) => {
  if (element instanceof HTMLElement && element.classList.contains("pitch")) {
    return element;
  }

  const pitch = element.closest(".pitch");
  return pitch instanceof HTMLElement ? pitch : null;
};

const clientToSvgPercent = (svg: ScreenTransformable, clientX: number, clientY: number) => {
  const ctm = svg.getScreenCTM?.();
  if (!ctm) return null;

  const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
};

/** Map viewport pointer coords to element-local 0–100% (handles ancestor CSS transforms). */
export const clientToElementPercent = (
  element: Element,
  clientX: number,
  clientY: number,
  contentWidth: number,
  contentHeight: number,
) => {
  if (contentWidth <= 0 || contentHeight <= 0) return null;

  const pitch = resolvePitchElement(element);

  if (pitch && isPortraitRotatorActive(element)) {
    return clientToPortraitRotatorPercent(pitch, clientX, clientY, pitch.clientWidth, pitch.clientHeight);
  }

  const mappingElement: ScreenTransformable | null =
    typeof (element as ScreenTransformable).getScreenCTM === "function"
      ? (element as ScreenTransformable)
      : pitch?.querySelector("svg.draw-layer") instanceof SVGSVGElement
        ? (pitch.querySelector("svg.draw-layer") as ScreenTransformable)
        : null;

  if (mappingElement) {
    return clientToSvgPercent(mappingElement, clientX, clientY);
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
  } else if (isPortraitRotatorActive(pitch)) {
    return null;
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
};
