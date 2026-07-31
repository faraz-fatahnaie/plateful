export const runtime = "edge";

function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v");
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

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: string };
    const id = youtubeId(url || "");
    if (!id) return Response.json({ error: "This episode does not have a direct YouTube video URL" }, { status: 400 });

    const watch = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    if (!watch.ok) throw new Error(`YouTube returned ${watch.status}`);
    const html = await watch.text();
    const rawTracks = balancedJsonArray(html, '"captionTracks":');
    if (!rawTracks) return Response.json({ error: "No public captions were found. Paste a transcript instead." }, { status: 404 });
    const tracks = JSON.parse(rawTracks) as Array<{ baseUrl?: string; languageCode?: string; name?: { simpleText?: string } }>;
    const track = tracks.find((item) => item.languageCode?.startsWith("en")) || tracks[0];
    if (!track?.baseUrl) return Response.json({ error: "No usable caption track was found" }, { status: 404 });

    const captions = await fetch(`${track.baseUrl}&fmt=json3`);
    if (!captions.ok) throw new Error(`Caption download returned ${captions.status}`);
    const payload = (await captions.json()) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
    const transcript = (payload.events || [])
      .flatMap((event) => event.segs || [])
      .map((segment) => segment.utf8 || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!transcript) return Response.json({ error: "The caption track was empty" }, { status: 404 });
    return Response.json({ transcript, source: "youtube-captions", language: track.name?.simpleText || track.languageCode || "unknown" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
