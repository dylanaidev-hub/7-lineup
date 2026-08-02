const GOOGLE_MAPS_HOSTS = new Set(["google.com", "maps.google.com", "goo.gl", "maps.app.goo.gl"]);

export function normalizeGoogleMapUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    const isGoogleMaps =
      (host === "google.com" && (url.pathname.startsWith("/maps") || url.pathname.includes("/maps/")))
      || host === "maps.google.com"
      || (host === "goo.gl" && url.pathname.startsWith("/maps"))
      || host === "maps.app.goo.gl";

    if (!GOOGLE_MAPS_HOSTS.has(host) || !isGoogleMaps) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function validateGoogleMapUrlInput(value: string): string | null {
  if (!value.trim()) return null;
  if (!normalizeGoogleMapUrl(value)) {
    return "Vui lòng nhập link Google Maps hợp lệ (maps.google.com hoặc maps.app.goo.gl).";
  }
  return null;
}
