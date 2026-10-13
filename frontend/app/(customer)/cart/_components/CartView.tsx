"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/_lib/cart/CartContext";
import styles from "../cart.module.css";

const won = new Intl.NumberFormat("ko-KR");

export function CartView() {
  const { items, toggleAll, toggleSelected, setQuantity, removeItem } = useCart();
  const [orderMessage, setOrderMessage] = useState("");

  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const selectedTotal = items
    .filter((item) => item.selected && item.available)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCount = items.filter((item) => item.selected && item.available).length;

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>장바구니가 비어 있습니다.</p>
        <p>다방 메뉴를 둘러보고 담아보세요.</p>
        <Link href="/menus">메뉴 담으러 가기</Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.selectAll}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => toggleAll(event.target.checked)}
          />
          전체 선택
        </label>
        <span>{items.length}개 담음</span>
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.id} className={styles.row} data-selected={item.selected}>
            <input
              type="checkbox"
              checked={item.selected}
              disabled={!item.available}
              onChange={(event) => toggleSelected(item.id, event.target.checked)}
              aria-label={`${item.name} 선택`}
            />
            <div className={styles.thumb}>
              <Image src={item.imageUrl} alt={item.name} fill sizes="64px" />
            </div>
            <div className={styles.info}>
              <span className={styles.nameRow}>
                <span className={styles.name}>{item.name}</span>
                {item.temperature && (
                  <span className={styles.tempBadge} data-temp={item.temperature}>
                    {item.temperature === "hot" ? "HOT" : "ICE"}
                  </span>
                )}
              </span>
              {item.available
                ? <span className={styles.price}>{won.format(item.price)}원</span>
                : <span className={styles.soldOut}>품절된 메뉴입니다</span>}
            </div>
            <div className={styles.actions}>
              <div className={styles.qty}>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= 10}>+</button>
              </div>
              <button type="button" className={styles.removeButton} onClick={() => removeItem(item.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.label}>선택 {selectedCount}개</span>
          <span className={styles.total}>{won.format(selectedTotal)}원</span>
        </div>
        <button
          type="button"
          className={styles.orderButton}
          disabled={selectedCount === 0}
          onClick={() => setOrderMessage("주문 기능은 준비 중입니다.")}
        >
          주문하기
        </button>
        {orderMessage && <p className={styles.orderMessage} role="status">{orderMessage}</p>}
      </div>
    </>
  );
}
