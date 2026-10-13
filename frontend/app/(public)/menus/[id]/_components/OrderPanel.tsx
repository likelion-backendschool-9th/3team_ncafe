"use client";

import { useState } from "react";
import type { Temperature } from "@/app/_lib/mock/menus";
import { useCart } from "@/app/_lib/cart/CartContext";
import styles from "../../menus.module.css";

const won = new Intl.NumberFormat("ko-KR");
const temperatureOptions: { value: Temperature; label: string; sub: string }[] = [
  { value: "hot", label: "따뜻하게", sub: "HOT" },
  { value: "ice", label: "시원하게", sub: "ICE" },
];
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;

type OrderPanelProps = {
  menuId: string;
  menuName: string;
  imageUrl: string;
  price: number;
  temperatures: Temperature[];
  available: boolean;
};

function TemperatureIcon({ type }: { type: Temperature }) {
  if (type === "hot") {
    return (
      <svg className={styles.tempIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4M16 3c-1 1.5 1 2.5 0 4" />
        <path d="M4 10h14v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-4z" />
        <path d="M18 11h1.5a2.5 2.5 0 0 1 0 5H17.5" />
      </svg>
    );
  }
  return (
    <svg className={styles.tempIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
    </svg>
  );
}

export function OrderPanel({ menuId, menuName, imageUrl, price, temperatures, available }: OrderPanelProps) {
  const { addItem } = useCart();
  const [temperature, setTemperature] = useState<Temperature | null>(temperatures[0] ?? null);
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [message, setMessage] = useState("");

  const changeQuantity = (next: number) => {
    setQuantity(Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, next)));
    setMessage("");
  };

  const addToCart = () => {
    addItem({ menuId, name: menuName, imageUrl, price, quantity, available, temperature });
    const option = temperature ? ` (${temperature === "hot" ? "HOT" : "ICE"})` : "";
    setMessage(`${menuName}${option} ${quantity}잔을 장바구니에 담았습니다.`);
  };

  return (
    <section className={styles.orderPanel} aria-labelledby="order-panel-title">
      <header className={styles.orderHeader}>
        <span className={styles.orderHeaderRule} aria-hidden="true" />
        <h2 className={styles.orderTitle} id="order-panel-title">주문서</h2>
        <span className={styles.orderHeaderRule} aria-hidden="true" />
      </header>

      <div className={styles.orderFields}>
        {temperatures.length > 0 && (
          <div className={styles.orderField}>
            <span className={styles.orderLabel} id="temperature-label">온도</span>
            <div className={styles.tempToggle} role="radiogroup" aria-labelledby="temperature-label">
              {/* 음료는 등록된 온도와 상관없이 손님이 HOT/ICE를 고를 수 있고, 등록된 첫 온도를 기본값으로 둔다 */}
              {temperatureOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={temperature === option.value}
                  disabled={!available}
                  data-temp={option.value}
                  className={styles.tempOption}
                  onClick={() => { setTemperature(option.value); setMessage(""); }}
                >
                  <TemperatureIcon type={option.value} />
                  <span className={styles.tempText}>
                    <span>{option.label}</span>
                    <small>{option.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.orderField} ${styles.orderFieldInline}`}>
          <span className={styles.orderLabel} id="quantity-label">수량</span>
          <span className={styles.orderLeader} aria-hidden="true" />
          <div className={styles.stepper} role="group" aria-labelledby="quantity-label">
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="수량 줄이기"
              disabled={!available || quantity <= MIN_QUANTITY}
              onClick={() => changeQuantity(quantity - 1)}
            >
              −
            </button>
            <output className={styles.stepperValue} aria-live="polite">
              {quantity}<small>잔</small>
            </output>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="수량 늘리기"
              disabled={!available || quantity >= MAX_QUANTITY}
              onClick={() => changeQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className={styles.orderPerforation} aria-hidden="true" />

      <div className={styles.orderTotal}>
        <span className={styles.orderLabel}>합계</span>
        <span className={styles.orderLeader} aria-hidden="true" />
        <strong className={styles.orderTotalPrice}>
          <span className={styles.wonSign}>₩</span>{won.format(price * quantity)}
        </strong>
      </div>

      <button type="button" className={styles.cartButton} disabled={!available} onClick={addToCart}>
        {available ? "장바구니에 담기" : "오늘은 품절입니다"}
      </button>
      <p className={styles.orderMessage} role="status">{message}</p>
    </section>
  );
}
