"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 관리자가 곡을 올리거나 바꾼 것을 열려 있는 화면들이 알아채는 간격. 곡이 끝나 넘어가는 것은 아래 타이머가 따로 맞춘다.
// 늦게 알아챈 화면도 서버 시각 기준 위치부터 틀기 때문에, 모든 화면이 이 간격 안에서 같은 지점을 듣게 된다.
const POLL_MS = 3_000;
// 서버가 다음 곡으로 넘긴 뒤에 다시 그리도록 끝나는 시각보다 조금 늦게 새로 고친다.
const AFTER_END_MS = 300;

// 뮤직박스를 보여 주는 화면에 둔다. 페이지를 다시 불러오지 않고 서버 컴포넌트만 새로 받아(router.refresh),
// 재생 중인 플레이어와 손님이 허락한 소리 재생을 그대로 둔 채 다음 곡으로 바꾼다.
// endsAt·serverNow: 지금 곡이 끝나는 서버 시각과 화면을 그린 순간의 서버 시각. 곡이 없거나 길이를 모르면 null이다.
export function MusicBoxRefresher({ endsAt, serverNow }: { endsAt: number | null; serverNow: number | null }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    let endTimer: number | undefined;
    if (endsAt !== null && serverNow !== null) {
      // 손님 기기 시계가 틀려도 서버 시각 기준으로 남은 시간만큼 기다린다.
      const remaining = endsAt - serverNow;
      endTimer = window.setTimeout(refresh, Math.max(0, remaining) + AFTER_END_MS);
    }
    // 다른 탭을 보면서 음악만 듣는 손님도 관리자가 바꾼 곡을 받도록 숨은 탭에서도 새로 고친다.
    // 숨은 탭은 브라우저가 타이머를 늦추므로, 화면으로 돌아오면 바로 한 번 더 새로 고친다.
    const poll = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(endTimer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt, serverNow, router]);

  return null;
}
