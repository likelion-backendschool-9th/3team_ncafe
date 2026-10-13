import { requireRole } from "@/app/_lib/session/session";
import { CartView } from "./_components/CartView";
import styles from "./cart.module.css";

export default async function CartPage() {
  await requireRole("customer", "/cart");
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>CART · 장바구니</p>
        <h1 className={styles.title}>담은 메뉴</h1>
      </div>
      <CartView />
    </div>
  );
}
