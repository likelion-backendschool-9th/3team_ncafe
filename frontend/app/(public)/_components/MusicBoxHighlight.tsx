import Link from "next/link";
import { DjBooth } from "@/app/_components/DjBooth";
import { fetchMusicBoxSongs, fetchNowPlaying } from "@/app/_lib/songs/api";
import { handwritingSequence } from "@/app/_lib/songs/handwriting";
import { onAirOf } from "@/app/_lib/songs/types";
import styles from "@/app/_components/music-box-highlight.module.css";
import { MusicBoxRefresher } from "@/app/_components/MusicBoxRefresher";
import { RequestMemo, RequestMemoBoard } from "@/app/_components/RequestMemo";

// 홈 하단 뮤직박스 칸: 지금 흐르는 노래(DJ 부스)와 다음 차례 신청곡 3곡을 사연과 함께 보여 준다.
// 곡이 끝나거나 관리자가 곡을 바꾸면 페이지를 다시 불러오지 않고 이 칸이 다음 곡으로 바뀐다.
export async function MusicBoxHighlight() {
  const [{ playlist }, now] = await Promise.all([fetchMusicBoxSongs(), fetchNowPlaying()]);
  const playing = now.current;
  const onAir = onAirOf(now);
  const nextUp = playlist.slice(0, 3);
  // 턴테이블 옆 메모지와 다음 차례 메모 3장이 모두 다른 손글씨가 되게 한 번에 고른다.
  const [playingHand, ...memoHands] = handwritingSequence(String(playing?.id ?? nextUp[0]?.id ?? ""), nextUp.length + 1);

  return (
    <section className={`container ${styles.section}`} aria-labelledby="home-music-box-title">
      <MusicBoxRefresher revision={now.revision} endsAt={onAir?.endsAt ?? null} serverNow={onAir?.serverNow ?? null} />
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>다방 이야기 · 뮤직박스</p>
          <h2 id="home-music-box-title" className={styles.title}>오늘 다방에 도착한 사연</h2>
          <p className={styles.lead}>뮤직박스 DJ가 손님들의 신청곡과 사연을 순서대로 틀어 드려요.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/musicbox">사연과 신청곡 보내기 →</Link>
        </div>
      </div>

      <div className={styles.frame}>
        <DjBooth
          key={playing?.id ?? "empty"}
          nowPlaying={playing ? {
            id: playing.id,
            songTitle: playing.songTitle,
            artist: playing.artist,
            story: playing.story,
            requesterName: playing.requesterName,
            youtubeVideoId: playing.youtubeVideoId,
            handwriting: playingHand,
          } : null}
          onAir={onAir}
          storySpeech
        />
      </div>

      <RequestMemoBoard
        title="다음 차례 신청곡"
        caption={`플레이리스트에 담긴 신청곡 · 재생 대기 ${playlist.length}곡`}
        empty="아직 플레이리스트에 담긴 신청곡이 없어요."
      >
        {nextUp.map((request, index) => (
          <RequestMemo key={request.id} request={request} handwriting={memoHands[index]} showTime={false} />
        ))}
      </RequestMemoBoard>
    </section>
  );
}
