"use client";

import { MAX_CART_ITEM_QUANTITY } from "@/app/_lib/cart/constants";
import styles from "../../menus.module.css";

const MIN_QUANTITY = 1;

type Props = {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

export function QuantityStepper({ value, disabled, onChange }: Props) {
  const change = (next: number) => onChange(Math.min(MAX_CART_ITEM_QUANTITY, Math.max(MIN_QUANTITY, next)));

  return (
    <div className={`${styles.orderField} ${styles.orderFieldInline}`}>
      <span className={styles.orderLabel} id="quantity-label">
        수량
      </span>
      <span className={styles.orderLeader} aria-hidden="true" />
      <div
        className={styles.stepper}
        role="group"
        aria-labelledby="quantity-label"
      >
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="수량 줄이기"
          disabled={disabled || value <= MIN_QUANTITY}
          onClick={() => change(value - 1)}
        >
          −
        </button>
        <output className={styles.stepperValue} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label="수량 늘리기"
          disabled={disabled || value >= MAX_CART_ITEM_QUANTITY}
          onClick={() => change(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
