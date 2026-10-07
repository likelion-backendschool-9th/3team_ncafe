import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MENU_IMAGE_PLACEHOLDER, mockMenuRepository } from "@/app/_lib/mock/menus";
import { requireRole } from "@/app/_lib/session/session";
import { deleteMenu } from "../_actions";
import { DeleteMenuButton } from "../_components/DeleteMenuButton";
import styles from "../menus.module.css";

const won = new Intl.NumberFormat("ko-KR");
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

export default async function MenuDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; deleteError?: string }>;
}) {
  const { id } = await params;
  await requireRole("admin", `/admin/menus/${id}`);
  const menu = await mockMenuRepository.get(id);
  if (!menu) notFound();

  const { updated, deleteError } = await searchParams;
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/admin">관리자 홈</Link><span aria-hidden="true">/</span>
        <Link href="/admin/menus">메뉴 목록</Link><span aria-hidden="true">/</span><span>{menu.name}</span>
      </nav>
      <div className={styles.heading}>
        <div><p className="eyebrow">메뉴 상세</p><h1>{menu.name}</h1><p>메뉴 정보를 확인하고 관리합니다.</p></div>
        <Link className="button" href={`/admin/menus/${id}/edit`}>메뉴 수정</Link>
      </div>
      {updated === "1" && <p className={styles.notice} role="status">메뉴를 수정했습니다.</p>}
      {deleteError === "1" && <p className="form-error" role="alert">메뉴를 삭제하지 못했습니다. 다시 시도해 주세요.</p>}
      <dl className={styles.detailCard}>
        <div><dt>이미지</dt><dd><Image className={styles.detailImage} src={menu.imageUrl || MENU_IMAGE_PLACEHOLDER} alt={`${menu.name} 이미지`} width={200} height={150} unoptimized /></dd></div>
        <div><dt>메뉴명 (한글)</dt><dd>{menu.name}</dd></div>
        <div><dt>메뉴명 (영어)</dt><dd>{menu.nameEn || "영문명 없음"}</dd></div>
        <div><dt>카테고리</dt><dd>{menu.categories.join(", ")}</dd></div>
        <div><dt>온도</dt><dd>{menu.temperatures.length > 0 ? menu.temperatures.map((t) => (t === "hot" ? "핫" : "아이스")).join(", ") : "온도 구분 없음"}</dd></div>
        <div><dt>설명</dt><dd>{menu.description}</dd></div>
        <div><dt>가격</dt><dd>{won.format(menu.price)}원</dd></div>
        <div><dt>판매 상태</dt><dd>{menu.available ? "판매 중" : "판매 중지"}</dd></div>
        <div><dt>NEW</dt><dd>{menu.isNew ? "표시" : "표시 안 함"}</dd></div>
        <div><dt>추천 메뉴</dt><dd>{menu.recommended ? "추천" : "추천 안 함"}</dd></div>
        <div><dt>등록일</dt><dd>{date.format(new Date(menu.createdAt))}</dd></div>
        <div><dt>최근 수정</dt><dd>{date.format(new Date(menu.updatedAt))}</dd></div>
      </dl>
      <div className={styles.detailActions}>
        <Link href="/admin/menus">목록으로</Link>
        <DeleteMenuButton action={deleteMenu.bind(null, id)} name={menu.name} />
      </div>
    </div>
  );
}
