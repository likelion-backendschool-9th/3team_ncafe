import { StatePanel } from "./_components/ui/StatePanel";

export default function Loading() {
  return (
    <main className="container page-content">
      <StatePanel eyebrow="잠시만요" title="화면을 불러오는 중입니다" description="필요한 정보를 준비하고 있습니다." />
    </main>
  );
}
