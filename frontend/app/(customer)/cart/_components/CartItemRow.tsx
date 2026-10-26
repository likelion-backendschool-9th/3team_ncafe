"use client";

import Image from "next/image";
import type { CartItemResponse } from "../../_lib/cart/types";
import styles from "../cart.module.css";
import { CartQuantityControl } from "./CartQuantityControl";
import { RemoveCartItemButton } from "./RemoveCartItemButton";

const won = new Intl.NumberFormat("ko-KR");

type Props = {
  item: CartItemResponse;
  selected: boolean;
  onToggle: (id: number, selected: boolean) => void;
  onError: (message: string | null) => void;
};

export function CartItemRow({ item, selected, onToggle, onError }: Props) {
  return (
    <div className={styles.row} data-selected={selected}>
      <input
        type="checkbox"
        checked={selected}
        disabled={!item.orderable}
        onChange={(event) => onToggle(item.id, event.target.checked)}
        aria-label={`${item.name} 선택`}
      />
      <div className={styles.thumb}>
        <Image src={item.imageUrl} alt={item.name} fill sizes="64px" />
      </div>
      <div className={styles.info}>
        <span className={styles.nameRow}>
          <span className={styles.name}>{item.name}</span>
          {item.temperature && (
            <span className={styles.tempBadge} data-temp={item.temperature === "hot" ? "hot" : "ice"}>
              {item.temperature === "hot" ? "HOT" : "ICE"}
            </span>
          )}
        </span>
        {item.orderable
          ? <span className={styles.price}>{won.format(item.unitPrice)}원</span>
          : <span className={styles.soldOut}>품절된 메뉴입니다</span>}
      </div>
      <div className={styles.actions}>
        <CartQuantityControl id={item.id} name={item.name} quantity={item.quantity} onError={onError} />
        <RemoveCartItemButton id={item.id} name={item.name} onError={onError} />
      </div>
    </div>
  );
}
