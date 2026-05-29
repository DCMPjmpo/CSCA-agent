/**
 * CSCA locale helpers — map UI locale to AI response language.
 */

export const COUNTRY_LOCALE_MAP: Record<string, string> = {
  TH: 'th',
  VN: 'vi',
  MY: 'ms',
  ID: 'id',
  PH: 'tl',
};

export function localeFromCountryCode(code: string): string {
  return COUNTRY_LOCALE_MAP[code] ?? 'en';
}

export function getLanguageInstruction(locale: string): string {
  const instructions: Record<string, string> = {
    th: 'Respond in Thai (ไทย). Use clear, student-friendly language.',
    vi: 'Respond in Vietnamese (Tiếng Việt). Use clear, student-friendly language.',
    id: 'Respond in Indonesian (Bahasa Indonesia). Use clear, student-friendly language.',
    ms: 'Respond in Malay (Bahasa Malaysia). Use clear, student-friendly language.',
    tl: 'Respond in Filipino. Use clear, student-friendly language.',
    en: 'Respond in English. Use clear, student-friendly language.',
    zh: '使用简体中文回答，语言清晰、适合国际学生理解。',
  };
  return instructions[locale] ?? instructions.en;
}

export function getLocaleLabel(locale: string): string {
  const labels: Record<string, string> = {
    th: 'ไทย',
    vi: 'Tiếng Việt',
    id: 'Bahasa Indonesia',
    ms: 'Bahasa Malaysia',
    tl: 'Filipino',
    en: 'English',
    zh: '简体中文',
  };
  return labels[locale] ?? 'English';
}
