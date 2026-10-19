import { mockMusicBoxRepository, musicBoxVersion } from "@/app/_lib/mock/music-box";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 열려 있는 뮤직박스 화면들이 몇 초마다 부른다. 화면 전체를 다시 그리지 않도록 상태 요약값 하나만 돌려준다.
// 시간이 다 된 곡은 목록을 읽는 순간 다음 곡으로 넘어가므로, 그 변화도 이 값에 반영된다.
export async function GET() {
  const version = musicBoxVersion(await mockMusicBoxRepository.list());
  return Response.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
