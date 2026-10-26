import Link from "next/link";
import { DjBooth } from "@/app/_components/DjBooth";
import boothStyles from "@/app/_components/music-box-highlight.module.css";
import { MusicBoxRefresher } from "@/app/_components/MusicBoxRefresher";
import { RequestMemo, RequestMemoBoard } from "@/app/_components/RequestMemo";
import { requireRole } from "@/app/_lib/session/session";
import { fetchMusicBoxSongs, fetchNowPlaying } from "@/app/_lib/songs/api";
import { handwritingSequence } from "@/app/_lib/songs/handwriting";
import { onAirOf } from "@/app/_lib/songs/types";
import styles from "../mypage.module.css";
import { deleteMyMusicRequest } from "./_actions";
import { DeleteRequestForm } from "./_components/DeleteRequestForm";
import { fetchMySongs } from "./_lib/api";
import { sortMySongs } from "./_lib/mySongs";

type SearchParams = Promise<{ deleted?: string; error?: string }>;

export default async function MyMusicRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("customer", "/my/songs");
  const [{ deleted, error }, songs, { playlist }, now] = await Promise.all([
    searchParams,
    fetchMySongs(),
    fetchMusicBoxSongs(),
    fetchNowPlaying(),
  ]);

  const playing = now.current;
  const onAir = onAirOf(now);
  const mine = sortMySongs(songs, playlist);
  // 내 메모는 모두 내 글씨 하나로, 다른 손님의 곡이 재생 중이면 메모지는 다른 글씨로 적는다.
  // 현재 곡 응답에는 신청 회원이 없어 내 곡 목록에 있는지로 판단한다.
  const [myHand, otherHand] = handwritingSequence(String(user.id), 2);
  const playingIsMine = playing !== null && songs.some((song) => song.id === playing.id);

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <MusicBoxRefresher revision={now.revision} endsAt={onAir?.endsAt ?? null} serverNow={onAir?.serverNow ?? null} />
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/my">마이페이지</Link>
        <span aria-hidden="true">/</span>
        <span>신청곡 · 사연</span>
      </nav>

      <header className={styles.heading}>
        <p className={styles.eyebrow}>MUSIC BOX · 나의 신청곡</p>
        <h1>보낸 신청곡과 사연</h1>
        <p>뮤직박스에 남긴 신청곡이 지금 어디쯤 흘러가고 있는지 확인하세요.</p>
      </header>

      {deleted === "1" && <p className={styles.notice} role="status">신청곡과 사연을 삭제했습니다.</p>}
      {error === "delete" && <p className={styles.error} role="alert">신청곡을 삭제하지 못했습니다. 재생 중인 곡은 삭제할 수 없어요.</p>}

      <section aria-label="뮤직박스">
        <div className={boothStyles.frame}>
          <DjBooth
            key={playing?.id ?? "empty"}
            nowPlaying={playing ? {
              id: playing.id,
              songTitle: playing.songTitle,
              artist: playing.artist,
              story: playing.story,
              requesterName: playing.requesterName,
              youtubeVideoId: playing.youtubeVideoId,
              handwriting: playingIsMine ? myHand : otherHand,
            } : null}
            onAir={onAir}
          />
        </div>

        <RequestMemoBoard
          title="내가 보낸 신청곡"
          titleLevel="h2"
          caption={`총 ${mine.length}곡 · 재생 중인 곡은 삭제할 수 없어요`}
          empty={<>아직 보낸 신청곡이 없어요. <Link href="/musicbox">신청곡 보내러 가기 →</Link></>}
        >
          {mine.map(({ song, badge }) => (
            <RequestMemo
              key={song.id}
              request={song}
              handwriting={myHand}
              badge={badge}
              badgeTone={song.status === "playing" ? "accent" : song.status === "played" || song.status === "cancelled" ? "muted" : "default"}
              action={song.status !== "playing" && (
                <DeleteRequestForm action={deleteMyMusicRequest.bind(null, song.id)} songTitle={song.songTitle} />
              )}
            />
          ))}
        </RequestMemoBoard>
      </section>
    </div>
  );
}
