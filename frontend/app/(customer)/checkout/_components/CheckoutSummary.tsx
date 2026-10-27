import cart from "../../cart/cart.module.css";
import styles from "../checkout.module.css";

const won = new Intl.NumberFormat("ko-KR");

type Props = {
  totalQuantity: number;
  totalAmount: number;
  agreed: boolean;
  isPending: boolean;
  missing: string[];
  error: string | null;
  onAgreementChange: (agreed: boolean) => void;
  onSubmit: () => void;
};

export function CheckoutSummary({
  totalQuantity,
  totalAmount,
  agreed,
  isPending,
  missing,
  error,
  onAgreementChange,
  onSubmit,
}: Props) {
  return (
    <aside className={styles.summary} aria-labelledby="checkout-summary">
      <h2 id="checkout-summary" className={styles.summaryTitle}>주문 금액</h2>
      <dl className={styles.amounts}>
        <div><dt>총 상품 금액 ({totalQuantity}개)</dt><dd>{won.format(totalAmount)}원</dd></div>
      </dl>
      <div className={styles.grandTotal}>
        <span>총 주문 금액</span>
        <strong>{won.format(totalAmount)}원</strong>
      </div>
      <label className={styles.agree}>
        <input type="checkbox" checked={agreed} disabled={isPending} onChange={(event) => onAgreementChange(event.target.checked)} />
        위 주문 내용을 확인했으며, 주문에 동의합니다.
      </label>
      <button type="button" className={cart.orderButton} disabled={missing.length > 0 || isPending} onClick={onSubmit}>
        {isPending ? "주문 접수 중..." : `${won.format(totalAmount)}원 주문 접수하기`}
      </button>
      {missing.length > 0 && !isPending && <p className={styles.hint}>남은 항목: {missing.join(" · ")}</p>}
      {error && <p className={cart.orderMessage} data-kind="error" role="alert">{error}</p>}
    </aside>
  );
}
