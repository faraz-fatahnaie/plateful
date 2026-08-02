import type { StudyVideo } from "./playlist-study";

const PERSIAN_PATTERN = /[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]/;

export function normalizeSearch(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export function matchesSearch(query: string, ...values: Array<string | number | null | undefined>) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return values.some((value) => normalizeSearch(String(value ?? "")).includes(needle));
}

export function videoMatchesSearch(video: StudyVideo, query: string) {
  return matchesSearch(query, video.index, video.title, video.topic, video.note, video.aiArtifacts?.summary, ...(video.aiArtifacts?.keyPoints || []));
}

export function hasPersian(value: string | null | undefined) {
  return PERSIAN_PATTERN.test(value || "");
}

export function languageProps(value: string | null | undefined) {
  return hasPersian(value) ? ({ lang: "fa", dir: "rtl" } as const) : ({ lang: "en", dir: "ltr" } as const);
}
