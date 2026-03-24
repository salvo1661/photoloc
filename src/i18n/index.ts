import type {
  DeepPartial,
  HistoryLabelKey,
  HistoryLabelParams,
  LayerNameKey,
  Messages,
} from "./types";
import { baseMessages } from "./base";
import { es } from "./lang/es";
import { pt } from "./lang/pt";
import { fr } from "./lang/fr";
import { de } from "./lang/de";
import { hi } from "./lang/hi";
import { ja } from "./lang/ja";
import { ko } from "./lang/ko";
import { id } from "./lang/id";
import { ar } from "./lang/ar";
import { zh } from "./lang/zh";
import { vi } from "./lang/vi";
import { it } from "./lang/it";
import { nl } from "./lang/nl";
import { tr } from "./lang/tr";
import { fa } from "./lang/fa";
import { ru } from "./lang/ru";
import { bn } from "./lang/bn";
import { uk } from "./lang/uk";
import { pl } from "./lang/pl";
import { th } from "./lang/th";
import { ur } from "./lang/ur";
import { sw } from "./lang/sw";

export { type HistoryLabelKey, type HistoryLabelParams, type LayerNameKey, type Messages };

export const supportedLanguages = [
  "zh",
  "en",
  "hi",
  "es",
  "ar",
  "pt",
  "id",
  "fr",
  "de",
  "ja",
  "ko",
  "vi",
  "tr",
  "fa",
  "it",
  "nl",
  "ru",
  "bn",
  "uk",
  "pl",
  "th",
  "ur",
  "sw",
];

export const languageNames: Record<string, string> = {
  zh: "ä¸­æ",
  en: "English",
  hi: "à¤¹à¤¿à¤¨à¥à¤¦à¥",
  es: "EspaÃ±ol",
  ar: "Ø§ÙØ¹Ø±Ø¨ÙØ©",
  pt: "PortuguÃªs",
  id: "Bahasa Indonesia",
  fr: "FranÃ§ais",
  de: "Deutsch",
  ja: "æ¥æ¬èª",
  ko: "íêµ­ì´",
  vi: "Tiáº¿ng Viá»t",
  tr: "TÃ¼rkÃ§e",
  fa: "ÙØ§Ø±Ø³Û",
  it: "Italiano",
  nl: "Nederlands",
  ru: "Ð ÑÑÑÐºÐ¸Ð¹",
  bn: "বাংলা",
  uk: "Українська",
  pl: "Polski",
  th: "ไทย",
  ur: "اردو",
  sw: "Kiswahili",
};

const overrides: Record<string, DeepPartial<Messages>> = {
  zh,
  hi,
  es,
  ar,
  pt,
  id,
  fr,
  de,
  ja,
  ko,
  vi,
  tr,
  fa,
  it,
  nl,
  ru,
  bn,
  uk,
  pl,
  th,
  ur,
  sw,
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const deepMerge = <T,>(base: T, override: DeepPartial<T>): T => {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  Object.keys(override).forEach((key) => {
    const baseValue = (base as Record<string, unknown>)[key];
    const overrideValue = (override as Record<string, unknown>)[key];
    if (isObject(baseValue) && isObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue as DeepPartial<typeof baseValue>);
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  });
  return result as T;
};

export const messages: Record<string, Messages> = Object.fromEntries(
  supportedLanguages.map((lang) => [
    lang,
    deepMerge(baseMessages, overrides[lang] ?? {}),
  ])
) as Record<string, Messages>;

export function getMessages(lang: string): Messages {
  return messages[supportedLanguages.includes(lang) ? lang : "en"];
}

export function formatTemplate(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function formatHistoryLabel(
  msgs: Messages,
  key: HistoryLabelKey,
  params?: HistoryLabelParams
): string {
  return formatTemplate(msgs.history[key], params ?? {});
}

export function formatLayerName(
  msgs: Messages,
  layer: { name: string; nameKey?: LayerNameKey; nameParams?: { index?: number } }
): string {
  if (layer.nameKey) {
    return formatTemplate(msgs.layers[layer.nameKey], layer.nameParams ?? {});
  }
  return layer.name;
}
