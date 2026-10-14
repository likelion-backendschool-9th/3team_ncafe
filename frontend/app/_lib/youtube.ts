const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

// 관리자가 붙여 넣은 YouTube 링크에서 11자리 영상 ID만 꺼낸다. 영상 링크가 아니면 null.
// watch?v=, youtu.be/, /shorts/, /embed/, /live/ 형식을 받고 &t=, &list= 같은 나머지 값은 버린다.
export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (videoIdPattern.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let candidate: string | null | undefined;

  if (host === "youtu.be") {
    candidate = segments[0];
  } else if (youtubeHosts.has(host)) {
    if (segments[0] === "watch") candidate = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(segments[0] ?? "")) candidate = segments[1];
  }

  return candidate && videoIdPattern.test(candidate) ? candidate : null;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
