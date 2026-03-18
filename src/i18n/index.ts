import type {
  DeepPartial,
  HistoryLabelKey,
  HistoryLabelParams,
  LayerNameKey,
  Messages,
} from "./types";
import { baseMessages } from "./base";
import { en } from "./lang/en";
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

export { type HistoryLabelKey, type HistoryLabelParams, type LayerNameKey, type Messages };

export const supportedLanguages = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "hi",
  "ja",
  "ko",
  "id",
  "ar",
  "zh",
];

export const languageNames: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  hi: "हिन्दी",
  ja: "日本語",
  ko: "한국어",
  id: "Bahasa Indonesia",
  ar: "العربية",
  zh: "中文",
};

const overrides: Record<string, DeepPartial<Messages>> = {
  en,
  es,
  pt,
  fr,
  de,
  hi,
  ja,
  ko,
  id,
  ar,
  zh,
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