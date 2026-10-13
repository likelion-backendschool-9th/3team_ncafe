import Link from "next/link";
import type { MusicRequest } from "@/app/_lib/mock/music-box";
import styles from "../music-box.module.css";

export type RequestRow = {
  request: MusicRequest;
  // 대기 중인 곡의 순번(1부터). 대기 중이 아니면 null.
  queuePosition: number | null;
};

type RequestTableProps = {
  rows: RequestRow[];
  firstNumber: number;
  page: number;
  totalPages: number;
  waitingCount: number;
  todayCount: number;
};

const requestedAtFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function requestedAt(value: string): string {
  const parts = Object.fromEntries(requestedAtFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function StatusBadge({ row }: { row: RequestRow }) {
  if (row.request.status === "playing") return <span className={`${styles.status} ${styles.statusPlaying}`}>재생 중</span>;
  if (row.request.status === "pending") return <span className={`${styles.status} ${styles.statusPending}`}>대기 {row.queuePosition}</span>;
  return <span className={`${styles.status} ${styles.statusPlayed}`}>재생 완료</span>;
}

export function RequestTable({ rows, firstNumber, page, totalPages, waitingCount, todayCount }: RequestTableProps) {
  return (
    <section className={`${styles.panel} ${styles.listPanel}`} aria-labelledby="queue-title">
      <h2 id="queue-title" className={styles.panelTitle}>
        <span className={styles.panelIcon} aria-hidden="true">♫</span>
        신청곡 목록
        <span className={styles.count}>대기 {waitingCount}곡 · 오늘 접수 {todayCount}곡</span>
      </h2>

      {rows.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.numberCell} scope="col">번호</th>
              <th scope="col">곡 제목 / 가수</th>
              <th scope="col">신청자</th>
              <th scope="col">사연</th>
              <th scope="col">상태</th>
              <th scope="col">신청일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.request.id} className={row.request.status === "playing" ? styles.rowPlaying : undefined}>
                <td className={styles.numberCell}>{firstNumber + index}</td>
                <td className={styles.songCell}>
                  <strong>{row.request.songTitle}</strong>
                  <span>{row.request.artist}</span>
                </td>
                <td className={styles.requesterCell}>{row.request.requesterName}</td>
                <td className={styles.storyCell}>{row.request.story}</td>
                <td><StatusBadge row={row} /></td>
                <td className={styles.dateCell}>{requestedAt(row.request.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.empty}>아직 접수된 신청곡이 없습니다.</p>
      )}

      {totalPages > 1 && (
        <nav className={styles.pager} aria-label="신청곡 목록 페이지">
          {page > 1 && <Link href={`/music-box?page=${page - 1}`} aria-label="이전 페이지">‹</Link>}
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={`/music-box?page=${number}`}
              className={number === page ? styles.pagerCurrent : undefined}
              aria-current={number === page ? "page" : undefined}
            >
              {number}
            </Link>
          ))}
          {page < totalPages && <Link href={`/music-box?page=${page + 1}`} aria-label="다음 페이지">›</Link>}
        </nav>
      )}
    </section>
  );
}
