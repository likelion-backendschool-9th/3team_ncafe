"use client";

import { useRouter } from "next/navigation";

const FALLBACK_PATH = "/menus";

export function useGoBack() {
  const router = useRouter();

  return () => {
    // 링크로 바로 들어와 이전 기록이 없으면 메뉴 목록으로 보낸다
    if (window.history.length > 1) router.back();
    else router.push(FALLBACK_PATH);
  };
}
