import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLocale, STRINGS, TranslationKey } from "../i18n/strings";

const STORAGE_KEY = "patwadi_locale";

type LocaleContextType = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (
        stored === "en" ||
        stored === "hi" ||
        stored === "pa" ||
        stored === "ta" ||
        stored === "te" ||
        stored === "mr" ||
        stored === "gu"
      ) {
        setLocaleState(stored);
      }
      setReady(true);
    });
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => STRINGS[locale][key] ?? STRINGS.en[key],
    [locale]
  );

  if (!ready) {
    return (
      <LocaleContext.Provider
        value={{ locale: "en", setLocale, t: (key) => STRINGS.en[key] }}
      >
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
