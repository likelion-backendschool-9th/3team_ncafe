import {
  MAX_ORDER_REQUEST_LENGTH,
  orderTypeLabels,
  paymentMethodLabels,
  type OrderType,
  type PaymentMethod,
} from "@/app/_lib/orders/types";
import styles from "../checkout.module.css";

const orderTypeHints: Record<OrderType, string> = {
  "dine-in": "자리에서 드시고 가요",
  takeout: "포장해서 가져가요",
};

const paymentMethodHints: Record<PaymentMethod, string> = {
  card: "카운터에서 카드로 결제",
  cash: "카운터에서 현금으로 결제",
};

type Props = {
  orderType: OrderType | null;
  paymentMethod: PaymentMethod | null;
  request: string;
  isPending: boolean;
  onOrderTypeChange: (value: OrderType) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onRequestChange: (value: string) => void;
};

export function CheckoutOptions({
  orderType,
  paymentMethod,
  request,
  isPending,
  onOrderTypeChange,
  onPaymentMethodChange,
  onRequestChange,
}: Props) {
  return (
    <>
      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.legend}>수령 방식</legend>
        <div className={styles.choices}>
          {(Object.keys(orderTypeLabels) as OrderType[]).map((type) => (
            <label key={type} className={styles.choice} data-checked={orderType === type}>
              <input type="radio" name="orderType" value={type} checked={orderType === type} onChange={() => onOrderTypeChange(type)} />
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
        <label htmlFor="order-request">요청사항 입력</label>
        <textarea
          id="order-request"
          className={styles.request}
          value={request}
          maxLength={MAX_ORDER_REQUEST_LENGTH}
          rows={3}
          disabled={isPending}
          placeholder="예) 얼음 적게, 덜 달게 해주세요"
          aria-labelledby="checkout-request"
          onChange={(event) => onRequestChange(event.target.value)}
        />
      </section>

      <fieldset className={styles.section} disabled={isPending}>
        <legend className={styles.legend}>카운터 결제수단</legend>
        <div className={styles.choices}>
          {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => (
            <label key={method} className={styles.choice} data-checked={paymentMethod === method}>
              <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => onPaymentMethodChange(method)} />
              <span className={styles.choiceLabel}>{paymentMethodLabels[method]}</span>
              <span className={styles.choiceHint}>{paymentMethodHints[method]}</span>
            </label>
          ))}
        </div>
        <p className={styles.note}>온라인 결제는 지원하지 않습니다. 주문 접수 후 카운터에서 결제해 주세요.</p>
      </fieldset>
    </>
  );
}
