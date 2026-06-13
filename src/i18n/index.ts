import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { RTL_LANGUAGES, resources, type LanguageCode } from './translations';

const SUPPORTED: LanguageCode[] = ['en', 'es', 'ru', 'ar'];

/** Best supported language for the device, falling back to English. */
export function deviceLanguage(): LanguageCode {
  const tag = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED as string[]).includes(tag) ? (tag as LanguageCode) : 'en';
}

export function isRtlLanguage(code: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(code);
}

let initialized = false;

/** Initialize i18next once. `preferred` is the persisted user choice (or null = system). */
export function initI18n(preferred: LanguageCode | null): void {
  if (initialized) return;
  initialized = true;
  // eslint-disable-next-line import/no-named-as-default-member -- i18next singleton API
  void i18n.use(initReactI18next).init({
    resources,
    lng: preferred ?? deviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    // RN has no Intl plural rules in some engines; keep it simple.
    compatibilityJSON: 'v4',
  });
}

export function changeLanguage(code: LanguageCode): void {
  // eslint-disable-next-line import/no-named-as-default-member -- i18next singleton API
  void i18n.changeLanguage(code);
}

// Eager default-language init so any `useTranslation` consumer has resources
// even before the root layout's preference-aware init runs. Re-init is a
// no-op; the root effect later switches to the persisted/device language.
initI18n(null);

export { i18n };
