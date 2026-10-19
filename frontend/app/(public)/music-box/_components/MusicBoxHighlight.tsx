import Link from "next/link";
import { mockMusicBoxRepository, playlistOf } from "@/app/_lib/mock/music-box";
import { DjBooth } from "./DjBooth";
import { handwritingSequence } from "./handwriting";
import styles from "./music-box-highlight.module.css";
import { RequestMemo, RequestMemoBoard } from "./RequestMemo";

// 홈 하단 뮤직박스 칸: 지금 흐르는 노래(DJ 부스)와 다음 차례 신청곡 3곡을 사연과 함께 보여 준다.
export async function MusicBoxHighlight() {
  const requests = await mockMusicBoxRepository.list();
  const playing = requests.find((request) => request.status === "playing");
  const playlist = playlistOf(requests);
  const nextUp = playlist.slice(0, 3);
  // 턴테이블 옆 메모지와 다음 차례 메모 3장이 모두 다른 손글씨가 되게 한 번에 고른다.
  const [playingHand, ...memoHands] = handwritingSequence(playing?.id ?? nextUp[0]?.id ?? "", nextUp.length + 1);

  return (
    <section className={`container ${styles.section}`} aria-labelledby="home-music-box-title">
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>다방 이야기 · 뮤직박스</p>
          <h2 id="home-music-box-title" className={styles.title}>오늘 다방에 도착한 사연</h2>
          <p className={styles.lead}>뮤직박스 DJ가 손님들의 신청곡과 사연을 순서대로 틀어 드려요.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/music-box">사연과 신청곡 보내기 →</Link>
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
