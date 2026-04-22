export type TextFontOption = {
  family: string;
  label: string;
  query: string;
};

export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { family: "Noto Sans", label: "Noto Sans", query: "Noto+Sans" },
  { family: "Noto Sans Arabic", label: "Noto Sans Arabic", query: "Noto+Sans+Arabic" },
  { family: "Noto Sans Devanagari", label: "Noto Sans Devanagari", query: "Noto+Sans+Devanagari" },
  { family: "Noto Sans Bengali", label: "Noto Sans Bengali", query: "Noto+Sans+Bengali" },
  { family: "Noto Sans Thai", label: "Noto Sans Thai", query: "Noto+Sans+Thai" },
  { family: "Noto Sans Tamil", label: "Noto Sans Tamil", query: "Noto+Sans+Tamil" },
  { family: "Noto Sans JP", label: "Noto Sans JP", query: "Noto+Sans+JP" },
  { family: "Noto Sans KR", label: "Noto Sans KR", query: "Noto+Sans+KR" },
  { family: "Noto Sans SC", label: "Noto Sans SC", query: "Noto+Sans+SC" },
  { family: "Noto Sans TC", label: "Noto Sans TC", query: "Noto+Sans+TC" },
];

const FONT_BY_LANGUAGE: Record<string, string> = {
  ar: "Noto Sans Arabic",
  bn: "Noto Sans Bengali",
  hi: "Noto Sans Devanagari",
  ja: "Noto Sans JP",
  ko: "Noto Sans KR",
  ta: "Noto Sans Tamil",
  th: "Noto Sans Thai",
  zh: "Noto Sans SC",
};

const findOption = (family: string): TextFontOption =>
  TEXT_FONT_OPTIONS.find((option) => option.family === family) ?? TEXT_FONT_OPTIONS[0];

export const getDefaultFontForLanguage = (lang: string): string =>
  FONT_BY_LANGUAGE[lang] ?? "Noto Sans";

export const ensureGoogleFontLoaded = (family: string): void => {
  if (typeof document === "undefined") return;
  const option = findOption(family);
  const id = `google-font-${option.family.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${option.query}:wght@400;500;700&display=swap`;
  document.head.appendChild(link);
};
