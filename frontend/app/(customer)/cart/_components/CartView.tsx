"use client";

import { useState } from "react";
import type { CartItemResponse } from "../../_lib/cart/types";
import styles from "../cart.module.css";
import { CartItemRow } from "./CartItemRow";
import { CartSummary } from "./CartSummary";
import { CartToolbar } from "./CartToolbar";

type Props = { items: CartItemResponse[] };

// 주문 대상 선택은 서버에 저장하지 않는 화면 상태다(DB 설계). 처음에는 주문 가능한 줄을 모두 고른다.
export function CartView({ items }: Props) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(items.filter((item) => item.orderable).map((item) => item.id)),
  );
  const [error, setError] = useState<string | null>(null);

  // 수량 변경·삭제 뒤 서버가 새 목록을 내려주므로, 사라졌거나 주문할 수 없게 된 줄은 선택에서 뺀다.
  const orderableItems = items.filter((item) => item.orderable);
  const selectedItems = orderableItems.filter((item) => selectedIds.has(item.id));
  const allSelected = orderableItems.length > 0 && selectedItems.length === orderableItems.length;

  function toggle(id: number, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(selected: boolean) {
    setSelectedIds(new Set(selected ? orderableItems.map((item) => item.id) : []));
  }

  return (
    <>
      <CartToolbar count={items.length} allSelected={allSelected} onToggleAll={toggleAll} />

      {/* 오류 안내는 미리 DOM에 두어야 화면 읽기 프로그램이 바뀐 내용을 읽는다 */}
      <div role="alert">
        {error && <p className={styles.orderMessage} data-kind="error">{error}</p>}
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id) && item.orderable}
            onToggle={toggle}
            onError={setError}
          />
        ))}
      </div>

      <CartSummary selectedItems={selectedItems} />
    </>
  );
}
