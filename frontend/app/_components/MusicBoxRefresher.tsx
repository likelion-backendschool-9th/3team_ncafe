"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 관리자가 곡을 올리거나 바꾼 것을 열려 있는 화면들이 알아채는 간격. 이때는 revision만 받아 비교한다.
// 늦게 알아챈 화면도 서버 시각 기준 위치부터 틀기 때문에, 모든 화면이 이 간격 안에서 같은 지점을 듣게 된다.
const POLL_MS = 3_000;
// 서버가 다음 곡으로 넘긴 뒤에 다시 그리도록 끝나는 시각보다 조금 늦게 새로 고친다.
const AFTER_END_MS = 300;

type MusicBoxRefresherProps = {
  // 이 화면을 그릴 때의 뮤직박스 revision. 서버 값과 다르면 화면을 새로 받는다.
  revision: number;
  // 지금 곡이 끝나는 서버 시각과 화면을 그린 순간의 서버 시각. 곡이 없거나 길이를 모르면 null이다.
  endsAt: number | null;
  serverNow: number | null;
};

// 뮤직박스를 보여 주는 화면에 둔다. 페이지를 다시 불러오지 않고 서버 컴포넌트만 새로 받아(router.refresh),
// 재생 중인 플레이어와 손님이 허락한 소리 재생을 그대로 둔 채 다음 곡으로 바꾼다.
export function MusicBoxRefresher({ revision, endsAt, serverNow }: MusicBoxRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let checking = false;

    async function checkVersion() {
      if (checking) return;
      checking = true;
      try {
        // 누구나 볼 수 있는 조회라 세션·CSRF 없이 rewrites로 백엔드를 바로 부른다. 시간이 다 된 곡은 이 조회에서 정리돼 revision에 반영된다.
        const response = await fetch("/api/v1/musicbox/songs/now", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { revision?: unknown };
        if (!stopped && typeof data.revision === "number" && data.revision !== revision) router.refresh();
      } catch {
        // 네트워크가 잠깐 끊겨도 다음 확인 때 다시 본다.
      } finally {
        checking = false;
      }
    }

    let endTimer: number | undefined;
    if (endsAt !== null && serverNow !== null) {
      // 곡이 끝나면 바뀌는 것이 확실하므로 확인 없이 바로 새로 고친다. 손님 기기 시계가 틀려도 서버 시각 기준으로 기다린다.
      endTimer = window.setTimeout(() => router.refresh(), Math.max(0, endsAt - serverNow) + AFTER_END_MS);
    }
    // 다른 탭을 보면서 음악만 듣는 손님도 관리자가 바꾼 곡을 받도록 숨은 탭에서도 확인한다.
    // 숨은 탭은 브라우저가 타이머를 늦추므로, 화면으로 돌아오면 바로 한 번 더 확인한다.
    const poll = window.setInterval(checkVersion, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(endTimer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [revision, endsAt, serverNow, router]);

  return null;
}
