"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "../../menus.module.css";
import { addCartItem } from "../_actions";
import { CartAddedDialog } from "./CartAddedDialog";
import { LoginRequiredDialog } from "./LoginRequiredDialog";
import { QuantityStepper } from "./QuantityStepper";
import { TemperaturePicker, type Temperature } from "./TemperaturePicker";
import { useGoBack } from "./useGoBack";

const won = new Intl.NumberFormat("ko-KR");

type OrderPanelProps = {
  menuId: number;
  menuSlug: string;
  price: number;
  temperatures: Temperature[];
  temperatureLabel: string;
  available: boolean;
  isLoggedIn: boolean;
};

export function OrderPanel({
  menuId,
  menuSlug,
  price,
  temperatures,
  temperatureLabel,
  available,
  isLoggedIn,
}: OrderPanelProps) {
  const [temperature, setTemperature] = useState<Temperature | null>(
    temperatures[0] ?? null,
  );
  const router = useRouter();
  const goBack = useGoBack();
  const [quantity, setQuantity] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startAdding] = useTransition();

  const addToCart = () => {
    if (!isLoggedIn) {
      setLoginDialogOpen(true);
      return;
    }
    setError(null);
    startAdding(async () => {
      const result = await addCartItem(menuId, menuSlug, temperature, quantity);
      if (result.ok) {
        setDialogOpen(true);
      } else if (result.needsLogin) {
        setLoginDialogOpen(true);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <section className={styles.orderPanel} aria-labelledby="order-panel-title">
      <header className={styles.orderHeader}>
        <span className={styles.orderHeaderRule} aria-hidden="true" />
        <h2 className={styles.orderTitle} id="order-panel-title">
          주문서
        </h2>
        <span className={styles.orderHeaderRule} aria-hidden="true" />
      </header>

      <div className={styles.orderFields}>
        {temperatures.length > 0 && (
          <TemperaturePicker
            label={temperatureLabel}
            options={temperatures}
            value={temperature}
            disabled={!available || isPending}
            onChange={setTemperature}
          />
        )}
        <QuantityStepper
          value={quantity}
          disabled={!available || isPending}
          onChange={setQuantity}
        />
      </div>

      <div className={styles.orderPerforation} aria-hidden="true" />

      <div className={styles.orderTotal}>
        <span className={styles.orderLabel}>합계</span>
        <span className={styles.orderLeader} aria-hidden="true" />
        <strong className={styles.orderTotalPrice}>
          <span className={styles.wonSign}>₩</span>
          {won.format(price * quantity)}
        </strong>
      </div>

      {/* 오류 안내는 미리 DOM에 두어야 화면 읽기 프로그램이 바뀐 내용을 읽는다 */}
      <div role="alert">
        {error && <p className={styles.orderError}>{error}</p>}
      </div>

      <button
        type="button"
        className={styles.cartButton}
        disabled={!available || isPending}
        onClick={addToCart}
      >
        {!available ? "오늘은 품절입니다" : isPending ? "담는 중..." : "장바구니에 담기"}
      </button>

      <CartAddedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => router.push("/cart")}
        onCancel={goBack}
      />

      <LoginRequiredDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onConfirm={() =>
          router.push(`/login?next=${encodeURIComponent(`/menus/${menuSlug}`)}`)
        }
      />
    </section>
  );
}
