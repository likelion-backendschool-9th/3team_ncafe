"use client";

import { startTransition, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/_lib/cart/CartContext";
import {
  MAX_ORDER_REQUEST_LENGTH,
  orderTypeLabels,
  paymentMethodLabels,
  type OrderType,
  type PaymentMethod,
} from "@/app/_lib/orders/types";
import { createCustomerOrder } from "../_actions";
import cart from "../../cart/cart.module.css";
import styles from "../checkout.module.css";

const won = new Intl.NumberFormat("ko-KR");

const orderTypeHints: Record<OrderType, string> = {
  "dine-in": "자리에서 드시고 가요",
  takeout: "포장해서 가져가요",
};

const paymentMethodHints: Record<PaymentMethod, string> = {
  card: "카운터에서 카드로 결제",
  cash: "카운터에서 현금으로 결제",
};

export function CheckoutView() {
  const router = useRouter();
  const { items, hydrated, removeItem } = useCart();
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [request, setRequest] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [isPending, beginOrder] = useTransition();
  const submitting = useRef(false);

  const orderItems = items.filter((item) => item.selected && item.available);
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const missing = [
    !orderType && "수령 방식",
    !paymentMethod && "결제 수단",
    !agreed && "주문 동의",
  ].filter(Boolean);

  function placeOrder() {
    if (submitting.current || orderItems.length === 0 || !orderType || !paymentMethod || !agreed) return;
    submitting.current = true;
    setError(null);

    const purchasedIds = orderItems.map((item) => item.id);
    const input = {
      items: orderItems.map((item) => ({
        menuId: item.menuId,
        option: item.temperature,
        quantity: item.quantity,
      })),
      expectedTotalAmount: totalAmount,
      orderType,
      paymentMethod,
      request,
    };

    beginOrder(async () => {
      try {
        const result = await createCustomerOrder(input);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        // 장바구니를 비우는 순간 "주문할 메뉴 없음" 화면이 잠깐 보이지 않도록 먼저 표시해 둔다
        startTransition(() => {
          setPlaced(true);
          purchasedIds.forEach(removeItem);
        });
        router.replace(`/orders/${encodeURIComponent(result.orderId)}?placed=1`);
      } catch {
        setError("주문 결과를 확인하지 못했습니다. 다시 주문하기 전에 주문목록을 확인해 주세요.");
      } finally {
        submitting.current = false;
      }
    });
  }

  if (!hydrated || placed) {
    return <p className={styles.loading} role="status">{placed ? "주문이 접수되었습니다. 주문 상세로 이동합니다..." : "주문서를 불러오는 중..."}</p>;
  }

  if (orderItems.length === 0) {
    return (
      <div className={cart.empty}>
        <p>주문할 메뉴가 없습니다.</p>
        <p>장바구니에서 주문할 메뉴를 선택해 주세요.</p>
        <Link href="/cart">장바구니로 가기</Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.sections}>
        <section className={styles.section} aria-labelledby="checkout-items">
          <div className={styles.sectionHeading}>
            <h2 id="checkout-items">주문 메뉴</h2>
            <Link href="/cart" className={styles.editLink}>장바구니에서 수정</Link>
          </div>
          <ul className={styles.itemList}>
            {orderItems.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={cart.thumb}>
                  <Image src={item.imageUrl} alt={item.name} fill sizes="64px" />
                </div>
                <div className={styles.itemInfo}>
                  <span className={cart.nameRow}>
                    <strong className={styles.itemName}>{item.name}</strong>
                    {item.temperature && (
                      <span className={cart.tempBadge} data-temp={item.temperature}>
                        {item.temperature === "hot" ? "HOT" : "ICE"}
                      </span>
                    )}
                  </span>
                  <span className={styles.itemMeta}>수량 {item.quantity}개 × {won.format(item.price)}원</span>
                </div>
                <strong className={styles.itemTotal}>{won.format(item.price * item.quantity)}원</strong>
              </li>
            ))}
          </ul>
        </section>

        <fieldset className={styles.section} disabled={isPending}>
          <legend className={styles.legend}>수령 방식</legend>
          <div className={styles.choices}>
            {(Object.keys(orderTypeLabels) as OrderType[]).map((type) => (
              <label key={type} className={styles.choice} data-checked={orderType === type}>
                <input
                  type="radio"
                  name="orderType"
                  value={type}
                  checked={orderType === type}
                  onChange={() => setOrderType(type)}
                />
                <span className={styles.choiceLabel}>{orderTypeLabels[type]}</span>
                <span className={styles.choiceHint}>{orderTypeHints[type]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className={styles.section} aria-labelledby="checkout-request">
          <div className={styles.sectionHeading}>
            <h2 id="checkout-request">요청사항 <span className={styles.optional}>선택</span></h2>
            <span className={styles.counter}>{request.length} / {MAX_ORDER_REQUEST_LENGTH}</span>
          </div>
          <textarea
            className={styles.request}
            value={request}
            maxLength={MAX_ORDER_REQUEST_LENGTH}
            rows={3}
            disabled={isPending}
            placeholder="예) 얼음 적게, 덜 달게 해주세요"
            aria-labelledby="checkout-request"
            onChange={(event) => setRequest(event.target.value)}
          />
        </section>

        <fieldset className={styles.section} disabled={isPending}>
          <legend className={styles.legend}>결제 수단</legend>
          <div className={styles.choices}>
            {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => (
              <label key={method} className={styles.choice} data-checked={paymentMethod === method}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                />
                <span className={styles.choiceLabel}>{paymentMethodLabels[method]}</span>
                <span className={styles.choiceHint}>{paymentMethodHints[method]}</span>
              </label>
            ))}
          </div>
          <p className={styles.note}>온라인 결제는 지원하지 않습니다. 주문 접수 후 카운터에서 결제해 주세요.</p>
        </fieldset>
      </div>

      <aside className={styles.summary} aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className={styles.summaryTitle}>최종 결제 금액</h2>
        <dl className={styles.amounts}>
          <div><dt>총 상품 금액 ({totalQuantity}개)</dt><dd>{won.format(totalAmount)}원</dd></div>
          <div><dt>할인 금액</dt><dd>0원</dd></div>
        </dl>
        <div className={styles.grandTotal}>
          <span>총 결제 금액</span>
          <strong>{won.format(totalAmount)}원</strong>
        </div>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} disabled={isPending} onChange={(event) => setAgreed(event.target.checked)} />
          위 주문 내용을 확인했으며, 주문에 동의합니다.
        </label>

        <button
          type="button"
          className={cart.orderButton}
          disabled={missing.length > 0 || isPending}
          onClick={placeOrder}
        >
          {isPending ? "주문 접수 중..." : `${won.format(totalAmount)}원 결제하기`}
        </button>
        {missing.length > 0 && !isPending && (
          <p className={styles.hint}>남은 항목: {missing.join(" · ")}</p>
        )}
        {error && <p className={cart.orderMessage} data-kind="error" role="alert">{error}</p>}
      </aside>
    </div>
  );
}
