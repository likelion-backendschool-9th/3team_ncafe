import localFont from "next/font/local";

// 신청곡 메모의 손글씨. 손님마다 다른 사람이 쓴 쪽지처럼 보이도록 4가지 글씨를 돌려 쓴다.
// 파일이 커서(하나에 약 0.9MB) 미리 받지 않고, 메모가 있는 화면에서 쓰일 때만 받는다.
const ddurae = localFont({ src: "../../fonts/Griun-HangeulDDURAE-Regular.woff2", display: "swap", preload: false });
const hyoje = localFont({ src: "../../fonts/Griun-Hyoje-Regular.woff2", display: "swap", preload: false });
const ahyoung = localFont({ src: "../../fonts/Griun-AhyoungsHandwriteIn2019-Regular.woff2", display: "swap", preload: false });
const hoisin = localFont({ src: "../../fonts/Griun-Hoisin-Regular.woff2", display: "swap", preload: false });

const handwritings = [ddurae, hyoje, ahyoung, hoisin].map((font) => font.className);

// 한 화면에 함께 보이는 메모 count장에 쓸 글씨를 차례로 돌려 준다. 4장까지는 모두 다른 글씨다.
// 시작 글씨는 seed(지금 재생 중인 곡 ID 등)로 정해, 새로고침해도 같고 곡이 바뀌면 배치가 달라진다.
export function handwritingSequence(seed: string, count: number): string[] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, index) => handwritings[(hash + index) % handwritings.length]);
}
