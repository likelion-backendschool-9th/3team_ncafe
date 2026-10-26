import Link from "next/link";
import { getCurrentUser } from "@/app/_lib/session/session";
import { fetchMusicBoxSongs, fetchNowPlaying } from "@/app/_lib/songs/api";
import { onAirOf } from "@/app/_lib/songs/types";
import { MusicBoxRefresher } from "@/app/_components/MusicBoxRefresher";
import { NowPlaying } from "./_components/NowPlaying";
import { RequestForm } from "./_components/RequestForm";
import { RequestTable } from "./_components/RequestTable";
import { requestRows, todayCount } from "./_lib/rows";
import styles from "./music-box.module.css";

type SearchParams = Promise<{ submitted?: string; page?: string }>;

const pageSize = 10;

export default async function MusicBoxPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ submitted, page: pageParam }, user, songs, now] = await Promise.all([
    searchParams,
    getCurrentUser(),
    fetchMusicBoxSongs(),
    fetchNowPlaying(),
  ]);

  const onAir = onAirOf(now);
  const rows = requestRows(songs, now.current);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1), totalPages);
  const firstIndex = (page - 1) * pageSize;

  return (
    <main className={styles.page}>
      <MusicBoxRefresher revision={now.revision} endsAt={onAir?.endsAt ?? null} serverNow={onAir?.serverNow ?? null} />
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
          <RequestForm member={user ? { name: user.name, role: user.role } : null} requestNumber={rows.length + 1} />
          <NowPlaying playing={now.current} onAir={onAir} next={songs.playlist[0]} />
        </div>

        <RequestTable
          rows={rows.slice(firstIndex, firstIndex + pageSize)}
          firstNumber={firstIndex + 1}
          page={page}
          totalPages={totalPages}
          waitingCount={songs.playlist.length}
          receivedCount={songs.inbox.length}
          todayCount={todayCount(rows, now.serverNow)}
        />

        {user?.role === "customer" && (
          <div className={styles.pageFoot}>
            <Link className={styles.gatePrimary} href="/my/songs">내 신청곡 관리</Link>
          </div>
        )}
      </div>
    </main>
  );
}
