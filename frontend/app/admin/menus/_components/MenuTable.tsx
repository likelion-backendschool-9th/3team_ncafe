import Image from "next/image";
import Link from "next/link";
import { MENU_IMAGE_PLACEHOLDER, type Menu } from "@/app/_lib/mock/menus";
import { deleteMenu } from "../_actions";
import { registeredDateLabel } from "../_lib/registeredDate";
import { DeleteMenuButton } from "./DeleteMenuButton";
import styles from "../menus.module.css";

const won = new Intl.NumberFormat("ko-KR");

export function MenuTable({ menus, createdId }: {
  menus: Menu[];
  createdId?: string;
}) {
  return (
    <>
      <p className={styles.scrollHint}>표를 좌우로 스크롤하면 모든 항목을 볼 수 있습니다.</p>
      <div className={styles.tableWrap} role="region" aria-label="메뉴 목록 표" tabIndex={0}>
        <table className={styles.table}>
          <caption className={styles.visuallyHidden}>관리자 메뉴 목록</caption>
          <thead>
            <tr>
              <th scope="col">이미지</th>
              <th scope="col">메뉴명 (한글 / 영어)</th>
              <th scope="col">카테고리</th>
              <th scope="col">가격</th>
              <th scope="col">상태</th>
              <th scope="col">등록일</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id} className={menu.id === createdId ? styles.createdRow : undefined}>
                <td>
                  <Image className={styles.menuThumbnail} src={menu.imageUrl || MENU_IMAGE_PLACEHOLDER} alt={`${menu.name} 이미지`} width={72} height={54} unoptimized />
                </td>
                <td>
                  <div className={styles.menuTitle}>
                    <Link className={styles.menuLink} href={`/admin/menus/${menu.id}`}>{menu.name}</Link>
                    {menu.isNew && <span className={styles.newBadge}>NEW</span>}
                    {menu.recommended && <span className={styles.recommendedBadge}>추천</span>}
                  </div>
                  <span className={styles.secondaryName}>{menu.nameEn || "영문명 없음"}</span>
                </td>
                <td>{menu.category}</td>
                <td>{won.format(menu.price)}원</td>
                <td>
                  <span className={`${styles.status} ${menu.available ? styles.statusAvailable : styles.statusUnavailable}`}>
                    {menu.available ? "판매 중" : "판매 중지"}
                  </span>
                </td>
                <td>{registeredDateLabel.format(new Date(menu.createdAt))}</td>
                <td>
                  <div className={styles.rowActions}>
                    <Link className={styles.editButton} href={`/admin/menus/${menu.id}/edit`}>수정</Link>
                    <DeleteMenuButton action={deleteMenu.bind(null, menu.id)} name={menu.name} label="삭제" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
