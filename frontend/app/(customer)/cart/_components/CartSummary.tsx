"use client";

import Link from "next/link";
import type { CartItemResponse } from "../../_lib/cart/types";
import styles from "../cart.module.css";

const won = new Intl.NumberFormat("ko-KR");

type Props = { selectedItems: CartItemResponse[] };

export function CartSummary({ selectedItems }: Props) {
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  // 주문서는 이 id들만 서버 장바구니에서 골라 보여 준다.
  const checkoutHref = `/checkout?cartItemIds=${selectedItems.map((item) => item.id).join(",")}`;

  return (
    <div className={styles.summary}>
      <div className={styles.summaryRow}>
        <span className={styles.label}>선택 {selectedItems.length}개</span>
        <span className={styles.total}>{won.format(selectedTotal)}원</span>
      </div>
      {selectedItems.length === 0 ? (
        <button type="button" className={styles.orderButton} disabled>
          주문하기
        </button>
      ) : (
        <Link href={checkoutHref} className={styles.orderButton}>
          주문하기
        </Link>
      )}
    </div>
  );
}
