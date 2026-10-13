"use client";

import { startTransition, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { MAX_CART_ITEM_QUANTITY, useCart } from "@/app/_lib/cart/CartContext";
import { createCustomerOrder } from "../_actions";
import styles from "../cart.module.css";

const won = new Intl.NumberFormat("ko-KR");

export function CartView() {
  const { items, toggleAll, toggleSelected, setQuantity, removeItem } = useCart();
  const [orderMessage, setOrderMessage] = useState<
    { kind: "success"; orderId: string } | { kind: "error"; text: string } | null
  >(null);
  const [isPending, beginOrder] = useTransition();
  const submitting = useRef(false);

  const allSelected = items.length > 0 && items.every((item) => item.selected);
  const selectedItems = items.filter((item) => item.selected && item.available);
  const selectedTotal = selectedItems
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedCount = selectedItems.length;

  function placeOrder() {
    if (submitting.current || selectedItems.length === 0) return;
    submitting.current = true;
    setOrderMessage(null);

    const purchasedIds = selectedItems.map((item) => item.id);
    const input = {
      items: selectedItems.map((item) => ({
        menuId: item.menuId,
        option: item.temperature,
        quantity: item.quantity,
      })),
      expectedTotalAmount: selectedTotal,
    };

    beginOrder(async () => {
      try {
        const result = await createCustomerOrder(input);
        if (!result.ok) {
          setOrderMessage({ kind: "error", text: result.message });
          return;
        }
        startTransition(() => {
          purchasedIds.forEach(removeItem);
          setOrderMessage({ kind: "success", orderId: result.orderId });
        });
      } catch {
        setOrderMessage({ kind: "error", text: "주문 결과를 확인하지 못했습니다. 다시 주문하기 전에 관리자에게 확인해 주세요." });
      } finally {
        submitting.current = false;
      }
    });
  }

  const feedback = orderMessage && (
    <p className={styles.orderMessage} data-kind={orderMessage.kind} role="status">
      {orderMessage.kind === "success" ? <>
        주문이 접수되었습니다. <Link href={`/orders/${encodeURIComponent(orderMessage.orderId)}`}>주문 상세보기</Link>
      </> : orderMessage.text}
    </p>
  );

  if (items.length === 0) {
    return (
      <>
        {feedback}
        <div className={styles.empty}>
          <p>장바구니가 비어 있습니다.</p>
          <p>다방 메뉴를 둘러보고 담아보세요.</p>
          <Link href="/menus">메뉴 담으러 가기</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.selectAll}>
          <input
            type="checkbox"
            checked={allSelected}
            disabled={isPending}
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
              disabled={!item.available || isPending}
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
                <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} disabled={isPending || item.quantity <= 1}>−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} disabled={isPending || item.quantity >= MAX_CART_ITEM_QUANTITY}>+</button>
              </div>
              <button type="button" className={styles.removeButton} disabled={isPending} onClick={() => removeItem(item.id)}>
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
          disabled={selectedCount === 0 || isPending}
          onClick={placeOrder}
        >
          {isPending ? "주문 접수 중..." : "주문하기"}
        </button>
        {feedback}
      </div>
    </>
  );
}
