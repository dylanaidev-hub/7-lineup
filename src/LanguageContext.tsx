import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getLanguageMeta, getStoredLanguage, setStoredLanguage, type Language } from "./languagePreference";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  languageMeta: ReturnType<typeof getLanguageMeta>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = useCallback((next: Language) => {
    setStoredLanguage(next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(getLanguageMeta(language).next);
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      languageMeta: getLanguageMeta(language),
    }),
    [language, setLanguage, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
