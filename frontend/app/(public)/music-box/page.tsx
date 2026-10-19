import Link from "next/link";
import { getCurrentUser } from "@/app/_lib/session/session";
import { inboxOf, mockMusicBoxRepository, onAirOf, playlistOf, type MusicRequest } from "@/app/_lib/mock/music-box";
import { MusicBoxRefresher } from "./_components/MusicBoxRefresher";
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
  const [{ submitted, page: pageParam }, user, requests] = await Promise.all([
    searchParams,
    getCurrentUser(),
    mockMusicBoxRepository.list(),
  ]);

  // 목록은 재생 중 → 플레이리스트 → 접수 → 재생 완료 순서다. 취소된 신청은 보이지 않는다.
  const playing = requests.find((request) => request.status === "playing");
  const onAir = onAirOf(playing);
  const playlist = playlistOf(requests);
  const inbox = inboxOf(requests);
  const played = requests.filter((request) => request.status === "played").sort(byPlayedAtDesc);
  const rows: RequestRow[] = [
    ...(playing ? [{ request: playing, queuePosition: null }] : []),
    ...playlist.map((request, index) => ({ request, queuePosition: index + 1 })),
    ...inbox.map((request) => ({ request, queuePosition: null })),
    ...played.map((request) => ({ request, queuePosition: null })),
  ];

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1), totalPages);
  const firstIndex = (page - 1) * pageSize;
  const today = seoulDate.format(new Date());
  const todayCount = requests.filter((request) => seoulDate.format(new Date(request.createdAt)) === today).length;

  return (
    <main className={styles.page}>
      <MusicBoxRefresher endsAt={onAir?.endsAt ?? null} serverNow={onAir?.serverNow ?? null} />
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
          <NowPlaying playing={playing} onAir={onAir} next={playlist[0]} />
        </div>

        <RequestTable
          rows={rows.slice(firstIndex, firstIndex + pageSize)}
          firstNumber={firstIndex + 1}
          page={page}
          totalPages={totalPages}
          waitingCount={playlist.length}
          receivedCount={inbox.length}
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
