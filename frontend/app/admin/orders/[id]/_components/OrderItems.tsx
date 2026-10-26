import Image from "next/image";
import type { AdminOrderResponse } from "../../_lib/types";
import { temperatureLabel, won } from "../../_lib/format";
import styles from "../order-detail-view.module.css";

type Props = { order: AdminOrderResponse };
export function OrderItems({ order }: Props) {
  return <section className={styles.items} aria-labelledby="order-items-title">
    <div className={styles.sectionHeading}><h2 id="order-items-title">주문 품목</h2><span>{order.items.length}종</span></div>
    <ul className={styles.itemList}>{order.items.map(item => <li className={styles.item} key={item.id}>
      <div className={styles.itemDescription}>
      <Image className={styles.itemImage} src={item.imageUrl} alt={`${item.menuName} 주문 당시 이미지`} width={64} height={64} unoptimized />
      <div className={styles.itemInfo}>
        <div className={styles.itemName}><strong>{item.menuName}</strong><span>{temperatureLabel(item.temperature)}</span></div>
        <p>수량 {item.quantity}개 <span aria-hidden="true">×</span> 단가 {won(item.unitPrice)}</p>
      </div></div><strong className={styles.itemAmount}>{won(item.lineTotal)}</strong>
    </li>)}</ul>
    <div className={styles.total}><span>총 주문 금액</span><strong>{won(order.totalAmount)}</strong></div>
  </section>;
}
