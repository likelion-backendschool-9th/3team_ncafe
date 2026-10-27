import Image from "next/image";
import Link from "next/link";
import type { CartItemResponse } from "../../_lib/cart/types";
import cart from "../../cart/cart.module.css";
import styles from "../checkout.module.css";

const won = new Intl.NumberFormat("ko-KR");

type Props = { items: CartItemResponse[] };

export function CheckoutItemList({ items }: Props) {
  return (
    <section className={styles.section} aria-labelledby="checkout-items">
      <div className={styles.sectionHeading}>
        <h2 id="checkout-items">주문 메뉴</h2>
        <Link href="/cart" className={styles.editLink}>장바구니에서 수정</Link>
      </div>
      <ul className={styles.itemList}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={cart.thumb}>
              <Image src={item.imageUrl} alt={item.name} fill sizes="64px" />
            </div>
            <div className={styles.itemInfo}>
              <span className={cart.nameRow}>
                <strong className={styles.itemName}>{item.name}</strong>
                {item.temperature && (
                  <span className={cart.tempBadge} data-temp={item.temperature === "hot" ? "hot" : "ice"}>
                    {item.temperature === "hot" ? "HOT" : "ICE"}
                  </span>
                )}
              </span>
              <span className={styles.itemMeta}>수량 {item.quantity}개 × {won.format(item.unitPrice)}원</span>
            </div>
            <strong className={styles.itemTotal}>{won.format(item.lineTotal)}원</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
