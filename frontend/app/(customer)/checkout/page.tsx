import { requireRole } from "@/app/_lib/session/session";
import { CheckoutView } from "./_components/CheckoutView";
import cart from "../cart/cart.module.css";

export default async function CheckoutPage() {
  await requireRole("customer", "/checkout");
  return (
    <div className={cart.page}>
      <div className={cart.heading}>
        <p className={cart.eyebrow}>CHECKOUT · 주문서</p>
        <h1 className={cart.title}>주문 / 결제</h1>
      </div>
      <CheckoutView />
    </div>
  );
}
