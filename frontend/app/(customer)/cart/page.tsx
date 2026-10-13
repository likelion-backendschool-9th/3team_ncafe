import { CartView } from "./_components/CartView";
import styles from "./cart.module.css";

export default function CartPage() {
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
