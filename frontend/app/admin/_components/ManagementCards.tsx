import styles from "../admin.module.css";
import { ManagementCard } from "./ManagementCard";

type Props = { activeOrderCount: number; pendingSongCount: number };

export function ManagementCards({ activeOrderCount, pendingSongCount }: Props) {
  return (
    <div className={styles.cards}>
      <ManagementCard label="회원 관리" title="회원 목록" tone="teal" href="/admin/users" linkLabel="회원 목록 보기"
        description="회원 정보를 조회하고 계정의 이용 정지와 해제를 관리합니다." />
      <ManagementCard label="메뉴 관리" title="메뉴 목록" tone="red" href="/admin/menus" linkLabel="메뉴 목록 보기"
        description="메뉴 목록에서 상세 확인, 등록, 수정, 삭제로 이동합니다." />
      <ManagementCard label="카테고리 관리" title="카테고리" tone="teal" href="/admin/categories" linkLabel="카테고리 관리"
        description="메뉴 등록 폼에서 선택할 카테고리를 추가·수정·삭제합니다." />
      <ManagementCard label="주문 관리" title="처리할 주문" count={{ value: activeOrderCount, unit: "건" }} tone="red"
        href="/admin/orders" linkLabel="주문 목록 보기" description="리스트에서 상태를 처리하거나 명세표 보기로 주문 품목을 확인합니다." />
      <ManagementCard label="뮤직박스" title="신청곡" count={{ value: pendingSongCount, unit: "곡 대기 중" }} tone="teal"
        href="/admin/songs" linkLabel="뮤직박스 운영" description="손님의 사연을 읽고 음원을 연결해 선곡합니다." />
    </div>
  );
}
