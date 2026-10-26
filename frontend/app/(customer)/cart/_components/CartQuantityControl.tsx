"use client";

import { useTransition } from "react";
import { MAX_CART_ITEM_QUANTITY } from "@/app/_lib/cart/constants";
import { changeCartItemQuantity } from "../_actions";
import styles from "../cart.module.css";

type Props = {
  id: number;
  name: string;
  quantity: number;
  onError: (message: string | null) => void;
};

export function CartQuantityControl({ id, name, quantity, onError }: Props) {
  const [isPending, startChanging] = useTransition();

  function change(next: number) {
    onError(null);
    startChanging(async () => {
      const result = await changeCartItemQuantity(id, next);
      if (!result.ok) onError(result.message);
    });
  }

  return (
    <div className={styles.qty} aria-busy={isPending}>
      <button
        type="button"
        aria-label={`${name} 수량 줄이기`}
        onClick={() => change(quantity - 1)}
        disabled={isPending || quantity <= 1}
      >
        −
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        aria-label={`${name} 수량 늘리기`}
        onClick={() => change(quantity + 1)}
        disabled={isPending || quantity >= MAX_CART_ITEM_QUANTITY}
      >
        +
      </button>
    </div>
  );
}
