export type Language = "vi" | "en";

const STORAGE_KEY = "lineup-football-language";

export function getStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

export function setStoredLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* ignore storage failures */
  }
}

export function getLanguageMeta(language: Language) {
  return language === "vi"
    ? { flag: "🇻🇳", label: "VI", next: "en" as const }
    : { flag: "🇺🇸", label: "EN", next: "vi" as const };
}
