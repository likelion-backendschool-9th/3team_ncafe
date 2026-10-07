import { StatePanel } from "@/app/_components/ui/StatePanel";
import { requireRole } from "@/app/_lib/session/session";

export default async function CartPage() {
  await requireRole("customer", "/cart");
  return <StatePanel eyebrow="고객" title="장바구니를 준비하고 있습니다" description="주문 단계에서 이 화면을 구현합니다." />;
}
