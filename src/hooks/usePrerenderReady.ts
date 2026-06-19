import { useEffect } from "react";

export function usePrerenderReady(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      document.dispatchEvent(new Event("prerender-ready"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready]);
}
