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
  const [readme, security, route, auth] = await Promise.all([
    source("README.md"),
    source("SECURITY.md"),
    source("app/api/projects/route.ts"),
    source("lib/server-auth.ts"),
  ]);

  assert.match(readme, /source code and bundled Codex skill are public/i);
  assert.match(security, /Do not commit real playlist exports/i);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(route, /getAuthenticatedUser/);
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
  assert.match(roadmap, /onOpenSession/);
  assert.match(roadmap, /Open \$\{longDate\(item\.date\)\} study session/);
  assert.match(app, /focusedSessionId/);
  assert.match(app, /Return to today’s session/);
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
  assert.match(video, /AI tools/);
  assert.match(reports, /Weekly watch time/);
  assert.match(notifications, /Email reminders/);
  assert.match(aiRoute, /api\.openai\.com\/v1/);
  assert.match(aiRoute, /localhost:11434/);
  assert.match(transcriptRoute, /captionTracks/);
  assert.match(emailRoute, /RESEND_API_KEY/);
  assert.match(design, /Video workspace/);
});

test("ships durable settings, external AI connections, and safe Calendar removal", async () => {
  const [app, settingsView, settingsRoute, aiTest, aiAnalyze, schema, migration, security] = await Promise.all([
    source("app/StudyApp.tsx"),
    source("app/components/SettingsView.tsx"),
    source("app/api/settings/route.ts"),
    source("app/api/ai/test/route.ts"),
    source("app/api/ai/analyze/route.ts"),
    source("db/schema.ts"),
    source("drizzle/0001_wealthy_beyonder.sql"),
    source("SECURITY.md"),
  ]);

  assert.match(app, /SettingsView/);
  assert.match(app, /Preserve past events, completed events, and all unrelated events/);
  assert.match(settingsView, /Remove playlist from Calendar/);
  assert.match(settingsView, /API keys are never written to app settings/);
  assert.match(settingsRoute, /getAuthenticatedUser/);
  assert.match(settingsRoute, /sanitizeAppSettings/);
  assert.match(aiTest, /TestRequest/);
  assert.match(aiAnalyze, /OPENAI_API_KEY/);
  assert.match(schema, /userSettings/);
  assert.match(migration, /CREATE TABLE `user_settings`/);
  assert.doesNotMatch(migration, /CREATE TABLE `playlist_projects`/);
  assert.match(security, /Session keys live in browser memory only/);
});

test("ships layered discovery controls and Persian typography", async () => {
  const [app, globalSearch, roadmap, discovery, layout, packageJson, design] = await Promise.all([
    source("app/StudyApp.tsx"),
    source("app/components/GlobalSearch.tsx"),
    source("app/components/RoadmapView.tsx"),
    source("lib/discovery.ts"),
    source("app/layout.tsx"),
    source("package.json"),
    source("docs/SEARCH_DISCOVERY_DESIGN.md"),
  ]);

  assert.match(app, /playlistStatus/);
  assert.match(app, /noteFilter/);
  assert.match(app, /Ctrl K/);
  assert.match(globalSearch, /Search playlists, videos, notes, topics, or dates/);
  assert.match(globalSearch, /relevance/);
  assert.match(roadmap, /duration-desc/);
  assert.match(roadmap, /filteredSessions/);
  assert.match(discovery, /PERSIAN_PATTERN/);
  assert.match(discovery, /dir: "rtl"/);
  assert.match(layout, /@fontsource-variable\/vazirmatn/);
  assert.match(packageJson, /@fontsource-variable\/vazirmatn/);
  assert.match(design, /Day\/Week\/Month/);
});

test("ships verified Google identity and cross-device account sync", async () => {
  const [app, accountMenu, authGate, accountRoute, auth, projectsRoute, settingsRoute, schema, migration, docs, security, packageJson] = await Promise.all([
    source("app/StudyApp.tsx"),
    source("app/components/AccountMenu.tsx"),
    source("app/components/AuthGate.tsx"),
    source("app/api/account/route.ts"),
    source("lib/server-auth.ts"),
    source("app/api/projects/route.ts"),
    source("app/api/settings/route.ts"),
    source("db/schema.ts"),
    source("drizzle/0002_lush_shiva.sql"),
    source("docs/GOOGLE_SIGN_IN.md"),
    source("SECURITY.md"),
    source("package.json"),
  ]);

  assert.match(app, /Cloud synced/);
  assert.match(app, /AccountMenu/);
  assert.match(accountMenu, /Synced across devices/);
  assert.match(authGate, /Continue with Google/);
  assert.match(accountRoute, /cache-control/);
  assert.match(auth, /jwtVerify/);
  assert.match(auth, /CF_ACCESS_AUD/);
  assert.match(auth, /localhost/);
  assert.match(projectsRoute, /user\.email/);
  assert.match(settingsRoute, /userAccounts/);
  assert.match(schema, /userAccounts/);
  assert.match(migration, /CREATE TABLE `user_accounts`/);
  assert.match(docs, /same verified email/);
  assert.match(security, /Never trust a client-supplied/);
  assert.match(packageJson, /"jose"/);
});

test("supports broad external AI connections and a safe ChatGPT account handoff", async () => {
  const [catalog, settings, video, analyze, aiDocs, env, security] = await Promise.all([
    source("lib/ai-providers.ts"),
    source("app/components/SettingsView.tsx"),
    source("app/components/VideoWorkspace.tsx"),
    source("app/api/ai/analyze/route.ts"),
    source("docs/AI_CONNECTIONS.md"),
    source(".env.example"),
    source("SECURITY.md"),
  ]);

  for (const provider of ["chatgpt", "openai", "anthropic", "gemini", "openrouter", "ollama", "lmstudio", "compatible"]) {
    assert.match(catalog, new RegExp(`id: "${provider}"`));
  }
  assert.match(settings, /Account-assisted/);
  assert.match(settings, /never asks for your ChatGPT password or cookies/);
  assert.match(video, /Copy prompt & open ChatGPT/);
  assert.match(video, /Import & show result/);
  assert.match(video, /STUDY_PROMPT_PRESETS/);
  assert.match(video, /Editable prompt/);
  assert.match(analyze, /api\.anthropic\.com/);
  assert.match(analyze, /generativelanguage\.googleapis\.com/);
  assert.match(analyze, /openrouter\.ai/);
  assert.match(aiDocs, /ChatGPT subscription does not include OpenAI API usage/);
  assert.match(env, /ANTHROPIC_API_KEY/);
  assert.match(env, /GEMINI_API_KEY/);
  assert.match(env, /OPENROUTER_API_KEY/);
  assert.match(security, /never asks for or stores a ChatGPT/);
});

test("ships a persistent Docker runtime with self-initializing D1 storage", async () => {
  const [dockerfile, compose, database, auth, health, packageJson] = await Promise.all([
    source("Dockerfile"),
    source("compose.yaml"),
    source("db/index.ts"),
    source("lib/server-auth.ts"),
    source("app/api/health/route.ts"),
    source("package.json"),
  ]);

  assert.match(dockerfile, /FROM node:24-bookworm-slim/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(compose, /plateful-data:\/app\/\.wrangler\/state/);
  assert.match(compose, /127\.0\.0\.1/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS playlist_projects/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS user_settings/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS user_accounts/);
  assert.match(auth, /local-preview@localhost\.test/);
  assert.match(health, /storage: "d1"/);
  assert.match(packageJson, /preview:docker/);
});

test("ships editable publisher, AI, and manual topic organization", async () => {
  const [contract, app, organizer, topicRoute, helpers, skill, skillContract, design] = await Promise.all([
    source("lib/playlist-study.ts"),
    source("app/StudyApp.tsx"),
    source("app/components/TopicOrganizer.tsx"),
    source("app/api/ai/topics/route.ts"),
    source("lib/topic-organization.ts"),
    source("skill/plan-youtube-playlist-study/SKILL.md"),
    source("skill/plan-youtube-playlist-study/references/app-data-contract.md"),
    source("docs/PRODUCT_DESIGN.md"),
  ]);

  assert.match(contract, /export type TopicMethod = "publisher" \| "ai" \| "manual"/);
  assert.match(contract, /publisherTopic\?: string/);
  assert.match(contract, /topicSource\?: TopicMethod/);
  assert.match(app, /Publisher structure \(recommended\)/);
  assert.match(app, /Organize topics/);
  assert.match(organizer, /Apply publisher structure/);
  assert.match(organizer, /Classify with AI/);
  assert.match(organizer, /Episode assignments/);
  assert.match(organizer, /Priority topics are scheduled first/);
  assert.match(topicRoute, /topicClassificationSchema/);
  assert.match(helpers, /Every video ID must appear exactly once/);
  assert.match(skill, /publisher or AI results are suggestions/);
  assert.match(skillContract, /Treat publisher and AI classifications as editable baselines/);
  assert.match(design, /User edits are the final authority/);
});

test("protects service routes and rejects malformed persisted state", async () => {
  const [auth, analyze, topics, aiTest, transcript, email, settings, settingsRoute, projectsRoute, validation, contract] = await Promise.all([
    source("lib/server-auth.ts"),
    source("app/api/ai/analyze/route.ts"),
    source("app/api/ai/topics/route.ts"),
    source("app/api/ai/test/route.ts"),
    source("app/api/videos/transcript/route.ts"),
    source("app/api/notifications/email/route.ts"),
    source("lib/app-settings.ts"),
    source("app/api/settings/route.ts"),
    source("app/api/projects/route.ts"),
    source("lib/playlist-validation.ts"),
    source("lib/playlist-study.ts"),
  ]);

  assert.match(auth, /export async function getServiceUser/);
  for (const route of [analyze, topics, aiTest, transcript, email]) assert.match(route, /getServiceUser\(request\)/);
  assert.match(email, /verified account address/);
  assert.match(settings, /Rebuild settings from an allowlist/);
  assert.match(settingsRoute, /sanitizeAppSettings\(input\)/);
  assert.match(projectsRoute, /isPlaylistStudyProject\(project\)/);
  assert.match(validation, /videoIds\.has\(id\)/);
  assert.match(contract, /unscheduled-\$\{project\.id\}/);
  assert.match(contract, /session\.date === today/);
});
