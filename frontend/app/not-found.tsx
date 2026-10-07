import Link from "next/link";
import { StatePanel } from "./_components/ui/StatePanel";

export default function NotFound() {
  return (
    <main className="container page-content">
      <StatePanel
        eyebrow="404"
        title="페이지를 찾을 수 없습니다"
        description="주소를 확인하거나 시작 화면으로 돌아가 주세요."
        action={<Link className="button" href="/">시작 화면으로</Link>}
      />
    </main>
  );
}
