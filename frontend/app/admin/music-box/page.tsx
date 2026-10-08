import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";
import { finishMusicRequest } from "./_actions";
import { PlaybackForm } from "./_components/PlaybackForm";
import styles from "./music-box.module.css";

type SearchParams = Promise<{ started?: string }>;

function requestedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminMusicBoxPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("admin", "/admin/music-box");
  const [{ started }, requests] = await Promise.all([searchParams, mockMusicBoxRepository.list()]);
  const playing = requests.find((request) => request.status === "playing");
  const pending = requests.filter((request) => request.status === "pending").reverse();
  const played = requests.filter((request) => request.status === "played").slice(0, 10);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className="eyebrow">MUSIC BOX</p>
        <h1>뮤직박스 운영</h1>
        <p>접수된 사연을 읽고 음원을 연결해 선곡하세요.</p>
      </header>

      {started === "1" && <p className={styles.notice} role="status">신청곡을 선곡했습니다. 아래 플레이어에서 재생할 수 있습니다.</p>}

      <section className={styles.section} aria-labelledby="on-air-title">
        <div className={styles.sectionHeading}>
          <h2 id="on-air-title">현재 선곡</h2>
          <span className={styles.count}>{playing ? "1곡" : "없음"}</span>
        </div>
        {playing ? (
          <article className={styles.currentCard}>
            <div>
              <strong>{playing.songTitle}</strong><span> · {playing.artist}</span>
              <p>{playing.requesterName}님의 사연: {playing.story}</p>
            </div>
            {playing.audioUrl && (
              <audio controls preload="none" src={playing.audioUrl} aria-label={`${playing.songTitle} 재생`}>
                브라우저가 오디오 재생을 지원하지 않습니다.
              </audio>
            )}
            <form action={finishMusicRequest.bind(null, playing.id)}>
              <button className={styles.finishButton} type="submit">재생 완료로 표시</button>
            </form>
          </article>
        ) : <p className={styles.empty}>선곡된 노래가 없습니다. 아래 신청 목록에서 한 곡을 선택해 주세요.</p>}
      </section>

      <section className={styles.section} aria-labelledby="pending-title">
        <div className={styles.sectionHeading}>
          <h2 id="pending-title">접수된 신청곡</h2>
          <span className={styles.count}>{pending.length}곡</span>
        </div>
        {pending.length > 0 ? (
          <div className={styles.requestList}>
            {pending.map((request) => (
              <article className={styles.requestCard} key={request.id}>
                <div className={styles.requestMeta}>
                  <span>{request.requesterName} · {requestedAt(request.createdAt)}</span>
                  <span>접수 대기</span>
                </div>
                <h3>{request.songTitle} <small>— {request.artist}</small></h3>
                <blockquote>{request.story}</blockquote>
                <PlaybackForm requestId={request.id} />
              </article>
            ))}
          </div>
        ) : <p className={styles.empty}>새 신청곡이 없습니다.</p>}
      </section>

      {played.length > 0 && (
        <section className={styles.section} aria-labelledby="played-title">
          <div className={styles.sectionHeading}><h2 id="played-title">지난 선곡</h2></div>
          <ul className={styles.history}>
            {played.map((request) => <li key={request.id}>{request.songTitle} · {request.artist}<span>{request.playedAt && requestedAt(request.playedAt)}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
