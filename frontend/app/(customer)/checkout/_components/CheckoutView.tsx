"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItemResponse } from "../../_lib/cart/types";
import type { OrderType, PaymentMethod } from "@/app/_lib/orders/types";
import { createCustomerOrder } from "../_actions";
import cart from "../../cart/cart.module.css";
import styles from "../checkout.module.css";
import { CheckoutItemList } from "./CheckoutItemList";
import { CheckoutOptions } from "./CheckoutOptions";
import { CheckoutSummary } from "./CheckoutSummary";

const won = new Intl.NumberFormat("ko-KR");

type Props = { items: CartItemResponse[] };

export function CheckoutView({ items: orderItems }: Props) {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [request, setRequest] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [isPending, beginOrder] = useTransition();
  const submitting = useRef(false);
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null);

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const missing = [
    !orderType && "수령 방식",
    !paymentMethod && "카운터 결제수단",
    !agreed && "주문 동의",
  ].filter((value): value is string => Boolean(value));

  function placeOrder() {
    if (submitting.current || orderItems.length === 0 || !orderType || !paymentMethod || !agreed) return;
    submitting.current = true;
    setError(null);

    const cartItemIds = orderItems.map((item) => item.id);
    const fingerprint = JSON.stringify({ cartItemIds, orderType, paymentMethod, request, totalAmount });
    if (!idempotency.current || idempotency.current.fingerprint !== fingerprint) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() };
    }

    beginOrder(async () => {
      try {
        const result = await createCustomerOrder({
          cartItemIds,
          expectedTotalAmount: totalAmount,
          orderType,
          paymentMethod,
          request,
          idempotencyKey: idempotency.current!.key,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setPlaced(true);
        router.replace(`/my/orders/${result.orderId}?placed=1`);
      } catch {
        setError("주문 결과를 확인하지 못했습니다. 다시 주문하기 전에 주문목록을 확인해 주세요.");
      } finally {
        submitting.current = false;
      }
    });
  }

  if (placed) {
    return <p className={styles.loading} role="status">주문이 접수되었습니다. 주문 상세로 이동합니다...</p>;
  }

  if (orderItems.length === 0) {
    return (
      <div className={cart.empty}>
        <p>주문할 메뉴가 없습니다.</p>
        <p>장바구니에서 주문할 항목을 선택해 주세요.</p>
        <Link href="/cart">장바구니로 가기</Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.sections}>
        <CheckoutItemList items={orderItems} />
        <CheckoutOptions
          orderType={orderType}
          paymentMethod={paymentMethod}
          request={request}
          isPending={isPending}
          onOrderTypeChange={setOrderType}
          onPaymentMethodChange={setPaymentMethod}
          onRequestChange={setRequest}
        />
      </div>
      <CheckoutSummary
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        agreed={agreed}
        isPending={isPending}
        missing={missing}
        error={error}
        onAgreementChange={setAgreed}
        onSubmit={placeOrder}
      />
    </div>
  );
}
