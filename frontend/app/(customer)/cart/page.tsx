import { requireRole } from "@/app/_lib/session/session";
import { getCartItems } from "../_lib/cart/api";
import { CartView } from "./_components/CartView";
import { EmptyCart } from "./_components/EmptyCart";
import styles from "./cart.module.css";

export default async function CartPage() {
  await requireRole("customer", "/cart");
  const cart = await getCartItems();

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>CART · 장바구니</p>
        <h1 className={styles.title}>담은 메뉴</h1>
      </div>
      {cart.items.length === 0 ? <EmptyCart /> : <CartView items={cart.items} />}
    </div>
  );
}
