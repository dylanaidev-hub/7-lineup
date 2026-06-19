import { useEffect, type RefObject } from "react";

type OutsidePointerDownEntry = {
  ref: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
};

export function useOutsidePointerDown(entries: OutsidePointerDownEntry[]) {
  useEffect(() => {
    if (!entries.some((entry) => entry.isOpen)) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      entries.forEach((entry) => {
        if (entry.isOpen && entry.ref.current && !entry.ref.current.contains(target)) {
          entry.onClose();
        }
      });
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [entries]);
}
