import Link from "next/link";
import { StatePanel } from "../_components/ui/StatePanel";

export default function ForbiddenPage() {
  return (
    <main className="container page-content">
      <StatePanel
        eyebrow="접근 제한"
        title="이 화면에 접근할 수 없습니다"
        description="현재 계정의 역할을 확인해 주세요."
        action={<Link className="button" href="/">시작 화면으로</Link>}
      />
    </main>
  );
}
