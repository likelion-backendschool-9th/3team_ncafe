import Link from "next/link";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { DjBooth } from "./DjBooth";
import styles from "./music-box-highlight.module.css";

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

// 홈 하단 뮤직박스 칸: 지금 흐르는 노래(DJ 부스)와 다음 차례 신청곡 3곡을 사연과 함께 보여 준다.
export async function MusicBoxHighlight() {
  const requests = await mockMusicBoxRepository.list();
  const playing = requests.find((request) => request.status === "playing");
  const queue = requests.filter((request) => request.status === "pending").reverse();
  const nextUp = queue.slice(0, 3);

  return (
    <section className={`container ${styles.section}`} aria-labelledby="home-music-box-title">
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>다방 이야기 · 뮤직박스</p>
          <h2 id="home-music-box-title" className={styles.title}>오늘 다방에 도착한 사연</h2>
          <p className={styles.lead}>뮤직박스 DJ가 손님들의 신청곡과 사연을 순서대로 틀어 드려요.</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.secondaryLink} href="/music-box">뮤직박스 전체 보기</Link>
          <Link className={styles.primaryLink} href="/music-box">사연과 신청곡 보내기 →</Link>
        </div>
      </div>

      <div className={styles.frame}>
        <DjBooth
          nowPlaying={playing ? {
            songTitle: playing.songTitle,
            artist: playing.artist,
            story: playing.story,
            requesterName: playing.requesterName,
            audioUrl: playing.audioUrl,
          } : null}
        />
      </div>

      <div className={styles.frontBoard}>
        <div className={styles.frontHead}>
          <h3>다음 차례 신청곡</h3>
          <span>DJ 부스에 도착한 신청곡 메모 · 대기 {queue.length}곡</span>
        </div>
        {nextUp.length > 0 ? (
          <ol className={styles.memos}>
            {nextUp.map((request, index) => (
              <li key={request.id} className={styles.memo}>
                <span className={`${styles.queueBadge} ${index === 0 ? styles.queueBadgeNext : ""}`}>대기 {index + 1}</span>
                <p className={styles.memoSong}>{request.songTitle} <small>· {request.artist}</small></p>
                <p className={styles.memoStory}>{request.story}</p>
                <p className={styles.memoMeta}>
                  <span>— {request.requesterName}님의 사연</span>
                  <span>{requestedAt(request.createdAt)}</span>
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyMemo}>아직 기다리는 신청곡이 없어요. 첫 사연을 보내 주세요.</p>
        )}
      </div>
    </section>
  );
}
