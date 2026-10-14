import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";

export const runtime = "nodejs";

const VOICE_ID = "tc_68257f68bc6e3c161ab5078d";
const MODEL = "ssfm-v30";

let cachedAudio: { text: string; bytes: Uint8Array<ArrayBuffer> } | null = null;
let pendingAudio: { text: string; promise: Promise<Uint8Array<ArrayBuffer>> } | null = null;

async function synthesize(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const apiKey = process.env.TYPECAST_API_KEY;
  if (!apiKey) throw new Error("TYPECAST_API_KEY is missing");

  const response = await fetch("https://api.typecast.ai/v1/text-to-speech", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice_id: VOICE_ID,
      text,
      language: "kor",
      output: { audio_format: "mp3" },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Typecast request failed: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function audioFor(text: string): Promise<Uint8Array<ArrayBuffer>> {
  if (cachedAudio?.text === text) return cachedAudio.bytes;
  if (pendingAudio?.text === text) return pendingAudio.promise;

  const promise = synthesize(text);
  pendingAudio = { text, promise };
  try {
    const bytes = await promise;
    cachedAudio = { text, bytes };
    return bytes;
  } finally {
    if (pendingAudio?.promise === promise) pendingAudio = null;
  }
}

export async function POST(request: Request) {
  let requestId: unknown;
  try {
    ({ requestId } = await request.json());
  } catch {
    return Response.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof requestId !== "string" || !requestId) {
    return Response.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const requests = await mockMusicBoxRepository.list();
  const current = requests.find((item) => item.status === "playing");
  if (!current || current.id !== requestId || !current.story.trim()) {
    return Response.json({ message: "현재 곡의 사연을 찾을 수 없어요." }, { status: 404 });
  }
  const speechText = `${current.requesterName}님의 사연입니다.\n\n${current.story.trim()}\n\n신청곡은 ${current.artist}의 ${current.songTitle}.`;
  if (speechText.length > 2000) {
    return Response.json({ message: "사연이 너무 길어 읽을 수 없어요." }, { status: 422 });
  }
  if (!process.env.TYPECAST_API_KEY) {
    return Response.json({ message: "Typecast API 키가 설정되지 않았어요." }, { status: 503 });
  }

  try {
    const bytes = await audioFor(speechText);
    return new Response(bytes, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Story speech synthesis failed", error);
    return Response.json({ message: "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
