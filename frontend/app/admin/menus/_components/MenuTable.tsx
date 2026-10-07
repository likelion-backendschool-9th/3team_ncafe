import Link from "next/link";
import type { Menu } from "@/app/_lib/mock/menus";
import styles from "../menus.module.css";

const won = new Intl.NumberFormat("ko-KR");
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export function MenuTable({ menus, createdId }: { menus: Menu[]; createdId?: string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>관리자 메뉴 목록</caption>
        <thead>
          <tr>
            <th scope="col">메뉴명</th>
            <th scope="col">가격</th>
            <th scope="col">판매 상태</th>
            <th scope="col">최근 수정</th>
          </tr>
        </thead>
        <tbody>
          {menus.map((menu) => (
            <tr key={menu.id} className={menu.id === createdId ? styles.createdRow : undefined}>
              <td>
                <Link className={styles.menuLink} href={`/admin/menus/${menu.id}`}>{menu.name}</Link>
                <span className={styles.description}>{menu.description}</span>
              </td>
              <td>{won.format(menu.price)}원</td>
              <td>
                <span className={`${styles.status} ${menu.available ? styles.statusAvailable : styles.statusUnavailable}`}>
                  {menu.available ? "판매 중" : "판매 중지"}
                </span>
              </td>
              <td>{date.format(new Date(menu.updatedAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
