import { requireRole } from "@/app/_lib/session/session";
import { getCartItems } from "../_lib/cart/api";
import { CheckoutView } from "./_components/CheckoutView";
import { parseCartItemIds } from "./_lib/searchParams";
import cart from "../cart/cart.module.css";

type CheckoutSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutPage({ searchParams }: { searchParams: CheckoutSearchParams }) {
  await requireRole("customer", "/checkout");
  const ids = parseCartItemIds(await searchParams);
  // 주문 대상은 /cart에서 고른 id 중 지금 내 장바구니에 있고 주문할 수 있는 줄이다.
  const { items } = await getCartItems();
  const orderItems = items.filter((item) => ids.has(item.id) && item.orderable);

  return (
    <div className={cart.page}>
      <div className={cart.heading}>
        <p className={cart.eyebrow}>CHECKOUT · 주문서</p>
        <h1 className={cart.title}>주문서</h1>
      </div>
      <CheckoutView items={orderItems} />
    </div>
  );
}
