"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../cart.module.css";

export type CartLineItem = {
  id: string;
  menuId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  available: boolean;
  selected: boolean;
};

const won = new Intl.NumberFormat("ko-KR");
const maxQuantity = 10;

export function CartView({ initialItems }: { initialItems: CartLineItem[] }) {
  const [items, setItems] = useState(initialItems);

  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const selectedTotal = items
    .filter((item) => item.selected && item.available)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCount = items.filter((item) => item.selected && item.available).length;

  function toggleAll(selected: boolean) {
    setItems((current) => current.map((item) => ({ ...item, selected })));
  }

  function toggleOne(id: string, selected: boolean) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, selected } : item)));
  }

  function changeQuantity(id: string, delta: number) {
    setItems((current) => current.map((item) => (
      item.id === id
        ? { ...item, quantity: Math.min(maxQuantity, Math.max(1, item.quantity + delta)) }
        : item
    )));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>장바구니가 비어 있습니다.</p>
        <p>다방 메뉴를 둘러보고 담아보세요.</p>
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
              onChange={(event) => toggleOne(item.id, event.target.checked)}
              aria-label={`${item.name} 선택`}
            />
            <div className={styles.thumb}>
              <Image src={item.imageUrl} alt={item.name} fill sizes="64px" />
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{item.name}</span>
              {item.available
                ? <span className={styles.price}>{won.format(item.price)}원</span>
                : <span className={styles.soldOut}>품절된 메뉴입니다</span>}
            </div>
            <div className={styles.qty}>
              <button type="button" onClick={() => changeQuantity(item.id, -1)} disabled={item.quantity <= 1}>−</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => changeQuantity(item.id, 1)} disabled={item.quantity >= maxQuantity}>+</button>
            </div>
            <button type="button" className={styles.removeButton} onClick={() => removeItem(item.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <span className={styles.label}>선택 {selectedCount}개</span>
        <span className={styles.total}>{won.format(selectedTotal)}원</span>
      </div>
    </>
  );
}
