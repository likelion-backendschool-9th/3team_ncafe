import { StatePanel } from "@/app/_components/ui/StatePanel";
import { requireRole } from "@/app/_lib/session/session";

export default async function DriverPage() {
  await requireRole("driver", "/driver");
  return <StatePanel eyebrow="배달기사" title="기사 화면을 준비하고 있습니다" description="6단계에서 담당 배달 목록을 연결합니다." />;
}
