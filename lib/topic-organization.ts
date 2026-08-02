import type { StudyVideo, TopicMethod } from "./playlist-study";

export type TopicClassification = { name: string; videoIds: string[] };

export const topicClassificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, videoIds: { type: "array", items: { type: "string" } } },
        required: ["name", "videoIds"],
      },
    },
  },
  required: ["topics"],
} as const;

export function buildTopicClassificationPrompt(title: string, videos: Array<Pick<StudyVideo, "id" | "index" | "title" | "publisherTopic" | "topic">>) {
  return [
    "Classify this YouTube playlist into clear, stable learning topics.",
    "Use only the supplied inventory. Prefer publisher section labels when they are meaningful, but merge noisy or overly narrow labels.",
    "Every video ID must appear exactly once. Keep videos in playlist order inside each topic.",
    "Return only JSON shaped as {\"topics\":[{\"name\":\"Topic\",\"videoIds\":[\"video-id\"]}] }.",
    `Playlist: ${title}`,
    "Inventory:",
    JSON.stringify(videos.map((video) => ({ id: video.id, index: video.index, title: video.title, publisherTopic: video.publisherTopic || null, currentTopic: video.topic || null }))),
  ].join("\n\n");
}

export function parseTopicClassifications(text: string, expectedIds: string[]) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const value = JSON.parse(cleaned) as { topics?: unknown };
  if (!Array.isArray(value.topics)) throw new Error("AI response must contain a topics array");
  const allowed = new Set(expectedIds);
  const seen = new Set<string>();
  const topics: TopicClassification[] = [];
  for (const candidate of value.topics) {
    if (!candidate || typeof candidate !== "object") continue;
    const name = typeof (candidate as { name?: unknown }).name === "string" ? (candidate as { name: string }).name.trim() : "";
    const ids = Array.isArray((candidate as { videoIds?: unknown }).videoIds) ? (candidate as { videoIds: unknown[] }).videoIds : [];
    const videoIds = ids.filter((id): id is string => typeof id === "string" && allowed.has(id) && !seen.has(id));
    videoIds.forEach((id) => seen.add(id));
    if (name && videoIds.length) topics.push({ name, videoIds });
  }
  const missing = expectedIds.filter((id) => !seen.has(id));
  if (missing.length) topics.push({ name: "Needs review", videoIds: missing });
  if (!topics.length) throw new Error("AI did not return any usable topic assignments");
  return topics;
}

export function applyClassifications(videos: StudyVideo[], topics: TopicClassification[], source: TopicMethod) {
  const assignment = new Map<string, string>();
  topics.forEach((topic) => topic.videoIds.forEach((id) => assignment.set(id, topic.name)));
  return videos.map((video) => ({ ...video, topic: assignment.get(video.id) || video.topic || "Needs review", topicSource: source }));
}
