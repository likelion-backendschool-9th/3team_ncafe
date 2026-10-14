import Link from "next/link";
import { getCurrentUser } from "@/app/_lib/session/session";
import { mockMusicBoxRepository, waitingQueueOf, type MusicRequest } from "@/app/_lib/mock/music-box";
import { NowPlaying } from "./_components/NowPlaying";
import { RequestForm } from "./_components/RequestForm";
import { RequestTable, type RequestRow } from "./_components/RequestTable";
import styles from "./music-box.module.css";

type SearchParams = Promise<{ submitted?: string; page?: string }>;

const pageSize = 10;
const seoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

function byPlayedAtDesc(a: MusicRequest, b: MusicRequest): number {
  return (b.playedAt ?? b.createdAt).localeCompare(a.playedAt ?? a.createdAt);
}

export default async function MusicBoxPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ submitted, page: pageParam }, user, requests, repeat] = await Promise.all([
    searchParams,
    getCurrentUser(),
    mockMusicBoxRepository.list(),
    mockMusicBoxRepository.getRepeatMode(),
  ]);

  // 목록은 재생 중 → 대기(플레이리스트 순, 그다음 접수 순) → 재생 완료(최근 순)로 보여 준다. 취소된 신청은 보이지 않는다.
  const playing = requests.find((request) => request.status === "playing");
  const queue = waitingQueueOf(requests);
  const played = requests.filter((request) => request.status === "played").sort(byPlayedAtDesc);
  const rows: RequestRow[] = [
    ...(playing ? [{ request: playing, queuePosition: null }] : []),
    ...queue.map((request, index) => ({ request, queuePosition: index + 1 })),
    ...played.map((request) => ({ request, queuePosition: null })),
  ];

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1), totalPages);
  const firstIndex = (page - 1) * pageSize;
  const today = seoulDate.format(new Date());
  const todayCount = requests.filter((request) => seoulDate.format(new Date(request.createdAt)) === today).length;

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.hero}>
          <span className={styles.heroRecord} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>삼다방 · MUSIC BOX</p>
            <h1><span aria-hidden="true">♪</span>뮤직박스<span aria-hidden="true">♪</span></h1>
            <p>그 시절의 노래가 지금도 우리의 마음을 따뜻하게 합니다.<br />듣고 싶은 노래와 사연을 남기면 뮤직박스 DJ가 순서대로 틀어 드려요.</p>
          </div>
          <p className={styles.heroNote} aria-hidden="true">좋은 노래는<br />언제 들어도<br />좋다…</p>
        </header>

        {submitted === "1" && (
          <p className={styles.success} role="status">사연과 신청곡이 접수됐습니다. 뮤직박스에서 순서대로 확인할게요.</p>
        )}

        <div className={styles.topRow}>
          <RequestForm memberName={user?.name ?? null} requestNumber={requests.length + 1} />
          <NowPlaying playing={playing} next={queue[0]} repeatOne={repeat === "one"} />
        </div>

        <RequestTable
          rows={rows.slice(firstIndex, firstIndex + pageSize)}
          firstNumber={firstIndex + 1}
          page={page}
          totalPages={totalPages}
          waitingCount={queue.length}
          todayCount={todayCount}
        />

        {user && (
          <div className={styles.pageFoot}>
            <Link className={styles.gatePrimary} href="/mypage/music-box">내 신청곡 관리</Link>
          </div>
        )}
      </div>
    </main>
  );
}
