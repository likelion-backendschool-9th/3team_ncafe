import Link from "next/link";
import { StatePanel } from "@/app/_components/ui/StatePanel";
import { getCurrentUser } from "@/app/_lib/session/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <main className="container page-content">
      <StatePanel
        eyebrow="nCafe"
        title="사용자 화면을 준비하고 있습니다"
        description="다음 개발 단계에서 메뉴 조회와 주문 흐름을 이곳에 연결합니다."
        action={user ? undefined : <Link className="button" href="/login">로그인하기</Link>}
      />
    </main>
  );
}
