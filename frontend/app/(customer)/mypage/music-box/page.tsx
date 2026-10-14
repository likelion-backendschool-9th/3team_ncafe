import Link from "next/link";
import {
  mockMusicBoxRepository,
  type MusicRequestStatus,
} from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";
import styles from "../mypage.module.css";

const statusLabels: Record<MusicRequestStatus, string> = {
  pending: "대기 중",
  playing: "재생 중",
  played: "재생 완료",
};

const requestDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function MyMusicRequestsPage() {
  const user = await requireRole("customer", "/mypage/music-box");
  const requests = await mockMusicBoxRepository.listByUser(user.id);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/mypage">마이페이지</Link>
        <span aria-hidden="true">/</span>
        <span>신청곡 · 사연</span>
      </nav>

      <header className={styles.heading}>
        <p className={styles.eyebrow}>MUSIC BOX · 나의 신청곡</p>
        <h1>보낸 신청곡과 사연</h1>
        <p>뮤직박스에 남긴 신청곡이 지금 어디쯤 흘러가고 있는지 확인하세요.</p>
      </header>

      {requests.length === 0 ? (
        <div className={styles.empty}>
          <h2>아직 보낸 신청곡이 없습니다</h2>
          <p>듣고 싶은 노래와 사연을 뮤직박스 DJ에게 보내 보세요.</p>
          <Link href="/music-box">신청곡 보내러 가기</Link>
        </div>
      ) : (
        <ul className={styles.requestList}>
          {requests.map((request) => (
            <li key={request.id}>
              <article className={styles.requestCard}>
                <div className={styles.requestTop}>
                  <div>
                    <strong>{request.songTitle}</strong>
                    <span>{request.artist}</span>
                  </div>
                  <span
                    className={styles.requestStatus}
                    data-status={request.status}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>
                <p className={styles.requestStory}>{request.story}</p>
                <time dateTime={request.createdAt}>
                  {requestDate.format(new Date(request.createdAt))} 신청
                </time>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
