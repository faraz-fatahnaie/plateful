import { createServer } from "node:http";

function balancedJsonArray(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("[", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

function decodeCaptionText(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

async function downloadTranscript(baseUrl) {
  const jsonResponse = await fetch(`${baseUrl}&fmt=json3`);
  if (jsonResponse.ok) {
    const raw = await jsonResponse.text();
    try {
      const payload = JSON.parse(raw);
      const text = (payload.events || []).flatMap((event) => event.segs || []).map((segment) => segment.utf8 || "").join(" ").replace(/\s+/g, " ").trim();
      if (text) return text;
    } catch {
      const text = [...raw.matchAll(/<(?:text|p)(?:\s[^>]*)?>([\s\S]*?)<\/(?:text|p)>/g)].map((match) => decodeCaptionText(match[1])).join(" ").replace(/\s+/g, " ").trim();
      if (text) return text;
    }
  }
  const xmlResponse = await fetch(baseUrl);
  if (!xmlResponse.ok) throw new Error(`Caption download returned ${xmlResponse.status}`);
  const xml = await xmlResponse.text();
  return [...xml.matchAll(/<(?:text|p)(?:\s[^>]*)?>([\s\S]*?)<\/(?:text|p)>/g)].map((match) => decodeCaptionText(match[1])).join(" ").replace(/\s+/g, " ").trim();
}

function youtubeConfig(source, key) {
  const match = source.match(new RegExp(`"${key}":"([^"]+)"`));
  return match?.[1] || "";
}

async function fetchPlayerTracks(html, id, language) {
  const apiKey = youtubeConfig(html, "INNERTUBE_API_KEY");
  if (!apiKey) return [];
  const player = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json", "origin": "https://www.youtube.com", "user-agent": "Mozilla/5.0 (compatible; PlatefulTranscript/1.0)" },
    body: JSON.stringify({ videoId: id, context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 35, hl: language, gl: "US" } } }),
  });
  if (!player.ok) return [];
  const payload = await player.json();
  return payload.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

async function transcript(id, language) {
  const preferredLanguage = language.split("-")[0].toLowerCase() || "en";
  const watch = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=${encodeURIComponent(preferredLanguage)}`, { headers: { "accept-language": `${language},en;q=0.8`, "cookie": "CONSENT=YES+cb", "user-agent": "Mozilla/5.0 (compatible; PlatefulTranscript/1.0)" } });
  if (!watch.ok) throw new Error(`YouTube returned ${watch.status}`);
  const html = await watch.text();
  const rawTracks = balancedJsonArray(html, '"captionTracks":');
  const tracks = [...(rawTracks ? JSON.parse(rawTracks) : []), ...await fetchPlayerTracks(html, id, language)];
  if (!tracks.length) throw new Error("No public captions were found. Paste a transcript instead.");
  const ordered = [...tracks].sort((left, right) => {
    const score = (item) => (item.languageCode?.toLowerCase().startsWith(preferredLanguage) ? 0 : 2) + (item.kind === "asr" ? 1 : 0);
    return score(left) - score(right);
  });
  for (const track of ordered) {
    if (!track?.baseUrl) continue;
    const text = await downloadTranscript(track.baseUrl);
    if (text) return { transcript: text, source: "youtube-captions", language: track.name?.simpleText || track.languageCode || "unknown" };
  }
  throw new Error("The caption track was empty");
}

createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1:3001");
    const id = url.searchParams.get("id") || "";
    if (!/^[\w-]{6,20}$/.test(id)) { response.statusCode = 400; response.end(JSON.stringify({ error: "Invalid YouTube video ID" })); return; }
    response.end(JSON.stringify(await transcript(id, url.searchParams.get("language") || "en-US")));
  } catch (error) {
    response.statusCode = 502;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Transcript extraction failed" }));
  }
}).listen(3001, "127.0.0.1", () => console.log("Transcript helper listening on 127.0.0.1:3001"));
