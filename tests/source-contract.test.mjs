import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the finished product instead of starter preview code", async () => {
  const [page, layout, packageJson] = await Promise.all([
    source("app/page.tsx"),
    source("app/layout.tsx"),
    source("package.json"),
  ]);

  assert.match(page, /<StudyApp \/>/);
  assert.match(layout, /Plateful/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

test("keeps the app and skill on one versioned data contract", async () => {
  const [contract, skill, docs] = await Promise.all([
    source("lib/playlist-study.ts"),
    source("skill/plan-youtube-playlist-study/SKILL.md"),
    source("docs/data-contract.md"),
  ]);

  assert.match(contract, /schemaVersion: 1/);
  assert.match(contract, /watched: boolean/);
  assert.match(contract, /syncState/);
  assert.match(skill, /app-data-contract\.md/);
  assert.match(docs, /Checked `videos\[\]\.watched` values are the source of truth/);
});

test("separates public source from private user and Calendar data", async () => {
  const [readme, security, route] = await Promise.all([
    source("README.md"),
    source("SECURITY.md"),
    source("app/api/projects/route.ts"),
  ]);

  assert.match(readme, /source code and bundled Codex skill are public/i);
  assert.match(security, /Do not commit real playlist exports/i);
  assert.match(route, /oai-authenticated-user-email/);
  assert.match(route, /storageId = `\$\{email\}::\$\{project\.id\}`/);
});

test("includes the complete roadmap and an interactive user guide", async () => {
  const [app, roadmap, guide, lpic, videos] = await Promise.all([
    source("app/StudyApp.tsx"),
    source("app/components/RoadmapView.tsx"),
    source("app/components/GuideView.tsx"),
    source("lib/lpic-roadmap.ts"),
    source("lib/lpic-videos.ts"),
  ]);

  assert.match(app, /RoadmapView/);
  assert.match(app, /How to use/);
  assert.match(roadmap, /type Frame = "journey" \| "day" \| "week" \| "month"/);
  assert.match(guide, /Missed a session/);
  assert.match(guide, /Watched extra videos/);
  assert.equal((lpic.match(/^  session\("/gm) ?? []).length, 55);
  assert.equal((videos.match(/^    "index":/gm) ?? []).length, 81);
});

test("ships the video cockpit, AI adapters, reports, and notifications", async () => {
  const [app, video, reports, notifications, aiRoute, transcriptRoute, emailRoute, design] = await Promise.all([
    source("app/StudyApp.tsx"),
    source("app/components/VideoWorkspace.tsx"),
    source("app/components/ReportsView.tsx"),
    source("app/components/NotificationCenter.tsx"),
    source("app/api/ai/analyze/route.ts"),
    source("app/api/videos/transcript/route.ts"),
    source("app/api/notifications/email/route.ts"),
    source("docs/PRODUCT_DESIGN.md"),
  ]);

  assert.match(app, /VideoWorkspace/);
  assert.match(app, /ReportsView/);
  assert.match(video, /youtube-nocookie\.com\/embed/);
  assert.match(video, /AI study studio/);
  assert.match(reports, /Weekly watch time/);
  assert.match(notifications, /Email reminders/);
  assert.match(aiRoute, /api\.openai\.com\/v1/);
  assert.match(aiRoute, /localhost:11434/);
  assert.match(transcriptRoute, /captionTracks/);
  assert.match(emailRoute, /RESEND_API_KEY/);
  assert.match(design, /Video workspace/);
});
