import { CartView, type CartLineItem } from "./_components/CartView";
import styles from "./cart.module.css";

// TODO: 백엔드 API 연동 전까지 쓰는 데모 데이터. 추후 GET /cart 응답으로 교체
const demoItems: CartLineItem[] = [
  { id: "1", menuId: "coffee", name: "커피", imageUrl: "/images/menus/coffee.jpg", price: 3500, quantity: 2, available: true, selected: true },
  { id: "2", menuId: "ssanghwacha", name: "쌍화차", imageUrl: "/images/menus/ssanghwacha.jpg", price: 6000, quantity: 1, available: true, selected: true },
  { id: "3", menuId: "fresh-arrowroot-juice", name: "생칡즙", imageUrl: "/images/menus/fresh-arrowroot-juice.jpg", price: 6000, quantity: 1, available: false, selected: false },
];

export default function CartPage() {
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p>장바구니</p>
          <h1>담은 메뉴</h1>
        </div>
      </div>
      <CartView initialItems={demoItems} />
    </div>
  );
}
