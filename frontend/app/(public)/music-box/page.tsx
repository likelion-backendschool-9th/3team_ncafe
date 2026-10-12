import { getCurrentUser } from "@/app/_lib/session/session";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { RequestForm } from "./_components/RequestForm";
import styles from "./music-box.module.css";

type SearchParams = Promise<{ submitted?: string }>;

function requestedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function MusicBoxPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ submitted }, user, requests] = await Promise.all([
    searchParams,
    getCurrentUser(),
    mockMusicBoxRepository.list(),
  ]);
  const playing = requests.find((request) => request.status === "playing");
  const pending = requests.filter((request) => request.status === "pending").reverse();

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.hero}>
          <p className={styles.eyebrow}>삼다방 · MUSIC BOX</p>
          <h1>당신의 사연에<br />한 곡을 올립니다</h1>
          <p>다방 한편의 뮤직박스에 노래와 이야기를 맡겨 주세요.</p>
        </header>

        {submitted === "1" && (
          <p className={styles.success} role="status">사연과 신청곡이 접수됐습니다. 뮤직박스에서 순서대로 확인할게요.</p>
        )}

        <div className={styles.layout}>
          <section className={styles.paperPanel} aria-labelledby="request-title">
            <p className={styles.panelEyebrow}>REQUEST A SONG</p>
            <h2 id="request-title">사연과 신청곡</h2>
            <p className={styles.intro}>듣고 싶은 노래와 그 노래에 담긴 이야기를 남겨 주세요.</p>
            <RequestForm defaultName={user?.name ?? ""} />
          </section>

          <div className={styles.sideColumn}>
            <section className={styles.paperPanel} aria-labelledby="playing-title">
              <p className={styles.panelEyebrow}>ON AIR</p>
              <h2 id="playing-title">지금 선곡된 노래</h2>
              {playing ? (
                <div className={styles.nowPlaying}>
                  <span className={styles.record} aria-hidden="true">♪</span>
                  <h3>{playing.songTitle}</h3>
                  <p className={styles.artist}>{playing.artist}</p>
                  <blockquote>{playing.story}</blockquote>
                  <p className={styles.requester}>— {playing.requesterName}님의 사연</p>
                  {playing.audioUrl && (
                    <audio controls preload="none" src={playing.audioUrl} aria-label={`${playing.songTitle} 재생`} className={styles.audioPlayer}>
                      브라우저가 오디오 재생을 지원하지 않습니다.
                    </audio>
                  )}
                  <p className={styles.formHint}>재생 버튼을 눌러 음악을 들어보세요.</p>
                </div>
              ) : (
                <p className={styles.empty}>아직 선곡된 노래가 없습니다. 첫 신청곡을 남겨 주세요.</p>
              )}
            </section>

            <section className={styles.paperPanel} aria-labelledby="queue-title">
              <p className={styles.panelEyebrow}>REQUEST LIST</p>
              <h2 id="queue-title">접수된 신청곡 <span className={styles.count}>{pending.length}</span></h2>
              {pending.length > 0 ? (
                <ol className={styles.queue}>
                  {pending.slice(0, 8).map((request) => (
                    <li key={request.id}>
                      <div><strong>{request.songTitle}</strong><span>{request.artist}</span></div>
                      <small>{request.requesterName} · {requestedAt(request.createdAt)}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.empty}>대기 중인 신청곡이 없습니다.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
