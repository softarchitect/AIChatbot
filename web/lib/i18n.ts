"use client";

import { useTranslations } from "next-intl";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

export type AppLocale = "en" | "ar";
type MessageTree = Record<string, unknown>;

export const locales: AppLocale[] = ["en", "ar"];

export const messagesByLocale: Record<AppLocale, MessageTree> = {
  en,
  ar,
};

export function useTranslation(_locale?: AppLocale) {
  const translate = useTranslations();
  return {
    t: (key: string) => translate(key),
  };
}
