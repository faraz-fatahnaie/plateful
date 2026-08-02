import { getServiceUser } from "../../../../lib/server-auth";

export const runtime = "edge";

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com")) return url.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function balancedJsonArray(source: string, marker: string) {
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
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

function decodeCaptionText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function downloadTranscript(baseUrl: string) {
  const jsonResponse = await fetch(`${baseUrl}&fmt=json3`);
  if (jsonResponse.ok) {
    const raw = await jsonResponse.text();
    try {
      const payload = JSON.parse(raw) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
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
  return [...xml.matchAll(/<(?:text|p)(?:\s[^>]*)?>([\s\S]*?)<\/(?:text|p)>/g)]
    .map((match) => decodeCaptionText(match[1]))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function youtubeConfig(source: string, key: string) {
  const match = source.match(new RegExp(`"${key}":"([^"]+)"`));
  return match?.[1] || "";
}

async function fetchPlayerTracks(html: string, id: string, language: string) {
  const apiKey = youtubeConfig(html, "INNERTUBE_API_KEY");
  if (!apiKey) return [];
  const player = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json", "origin": "https://www.youtube.com", "user-agent": "Mozilla/5.0 (compatible; PlatefulTranscript/1.0)" },
    body: JSON.stringify({ videoId: id, context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 35, hl: language, gl: "US" } } }),
  });
  if (!player.ok) return [];
  const payload = (await player.json()) as { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string; name?: { simpleText?: string } }> } } };
  return payload.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
}

export async function POST(request: Request) {
  try {
    if (!await getServiceUser(request)) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const { url, language } = (await request.json()) as { url?: string; language?: string };
    const id = youtubeId(url || "");
    if (!id) return Response.json({ error: "This episode does not have a direct YouTube video URL" }, { status: 400 });

    const { env } = await import("cloudflare:workers");
    const bindings = env as unknown as Record<string, string | undefined>;
    const proxyUrl = bindings.TRANSCRIPT_PROXY_URL || (bindings.DEV_AUTH_EMAIL ? "http://127.0.0.1:3001" : "");
    if (proxyUrl) {
      try {
        const proxy = await fetch(`${proxyUrl.replace(/\/$/, "")}/?id=${encodeURIComponent(id)}&language=${encodeURIComponent(language || "en-US")}`);
        const payload = (await proxy.json()) as { transcript?: string; source?: string; language?: string; error?: string };
        if (proxy.ok && payload.transcript) return Response.json(payload);
        if (payload.error) return Response.json({ error: payload.error }, { status: proxy.status });
      } catch {
        // Hosted deployments can continue with the native Worker fetch below.
      }
    }

    const preferredLanguage = language?.split("-")[0]?.toLowerCase() || "en";
    const watch = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=${encodeURIComponent(preferredLanguage)}`, {
      headers: {
        "accept-language": `${language || "en-US"},en;q=0.8`,
        "cookie": "CONSENT=YES+cb",
        "user-agent": "Mozilla/5.0 (compatible; PlatefulTranscript/1.0)",
      },
    });
    if (!watch.ok) throw new Error(`YouTube returned ${watch.status}`);
    const html = await watch.text();
    const rawTracks = balancedJsonArray(html, '"captionTracks":');
    const tracks = [
      ...(rawTracks ? JSON.parse(rawTracks) as Array<{ baseUrl?: string; languageCode?: string; kind?: string; name?: { simpleText?: string } }> : []),
      ...await fetchPlayerTracks(html, id, language || "en-US"),
    ];
    if (!tracks.length) return Response.json({ error: "No public captions were found. Paste a transcript instead." }, { status: 404 });
    const ordered = [...tracks].sort((left, right) => {
      const score = (item: typeof tracks[number]) => (item.languageCode?.toLowerCase().startsWith(preferredLanguage) ? 0 : 2) + (item.kind === "asr" ? 1 : 0);
      return score(left) - score(right);
    });
    for (const track of ordered) {
      if (!track?.baseUrl) continue;
      const transcript = await downloadTranscript(track.baseUrl);
      if (transcript) return Response.json({ transcript, source: "youtube-captions", language: track.name?.simpleText || track.languageCode || "unknown" });
    }
    return Response.json({ error: "The caption track was empty" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
