import { MusicBoxRefresher } from "@/app/_components/MusicBoxRefresher";
import { requireRole } from "@/app/_lib/session/session";
import { cancelCurrent, cancelRequest, finishCurrent, moveInPlaylist, moveToPlayed, playNow, returnToInbox } from "./_actions";
import { AddToPlaylistForm } from "./_components/AddToPlaylistForm";
import { CancelRequestForm } from "./_components/CancelRequestForm";
import { OnAirPlayer } from "./_components/OnAirPlayer";
import { RequestCard } from "./_components/RequestCard";
import { YouTubePreview } from "./_components/YouTubePreview";
import { fetchSongs } from "./_lib/api";
import { inboxOf, musicBoxVersion, onAirOf, playlistOf } from "./_lib/helpers";
import type { SongResponse } from "./_lib/types";
import styles from "./music-box.module.css";

const requestedAtFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function requester(song: SongResponse): string {
  return `${song.requesterName} · ${requestedAtFormat.format(new Date(song.createdAt))}`;
}

function Story({ request }: { request: SongResponse }) {
  return <blockquote className={styles.story}>{request.story}</blockquote>;
}

function MediaPreview({ request }: { request: SongResponse }) {
  return request.youtubeVideoId
    ? <YouTubePreview videoId={request.youtubeVideoId} title={request.songTitle} />
    : <div className={styles.previewEmpty}>연결된 영상이 없어요.</div>;
}

export default async function AdminMusicBoxPage() {
  await requireRole("admin", "/admin/songs");
  const songs = await fetchSongs();
  const playing = songs.find((song) => song.status === "playing");
  const playlist = playlistOf(songs);
  const inbox = inboxOf(songs);
  const played = songs
    .filter((song) => song.status === "played")
    .sort((a, b) => (b.playedAt ?? "").localeCompare(a.playedAt ?? ""))
    .slice(0, 10);
  const onAir = onAirOf(playing);

  return (
    <div className={styles.page}>
      <MusicBoxRefresher version={musicBoxVersion(songs)} endsAt={onAir?.endsAt ?? null} serverNow={onAir?.serverNow ?? null} />
      <header className={styles.heading}>
        <p className="eyebrow">MUSIC BOX</p>
        <h1>뮤직박스 운영</h1>
        <p>접수된 사연에 YouTube 링크를 붙여 플레이리스트에 담고, 플레이리스트 순서대로 틀어 주세요.</p>
      </header>

      <section className={styles.section} aria-labelledby="on-air-title">
        <div className={styles.sectionHeading}>
          <h2 id="on-air-title">현재 선곡</h2>
          <span className={styles.count}>{playing ? "1곡" : "없음"}</span>
        </div>
        {playing ? (
          <RequestCard
            tone="playing"
            badge="재생 중"
            songTitle={playing.songTitle}
            artist={playing.artist}
            requester={requester(playing)}
            defaultOpen
          >
            <Story request={playing} />
            <div className={styles.mediaRow}>
              {playing.youtubeVideoId
                ? <OnAirPlayer key={playing.id} requestId={playing.id} videoId={playing.youtubeVideoId} title={playing.songTitle} onAir={onAir} />
                : <MediaPreview request={playing} />}
              <div className={styles.mediaSide}>
                <div>
                  <p>지금 손님 화면에서 같은 위치로 함께 나오는 곡이에요.</p>
                  <p className={styles.hint}>
                    {playing.durationSeconds
                      ? "영상 길이만큼 지나면 손님 화면이 닫혀 있어도 지난 선곡으로 넘어가고, 플레이리스트 맨 앞 곡이 자동으로 재생돼요."
                      : "영상 길이를 아직 몰라서, 손님 화면에서 영상이 끝나면 다음 곡으로 넘어가요."}
                  </p>
                  <p className={styles.hint}>재생 완료를 누르면 바로 넘어가고, 선곡 취소를 누르면 접수된 신청곡으로 돌아가요.</p>
                </div>
                <div className={styles.actions}>
                  <form action={finishCurrent.bind(null, playing.id)}>
                    <button className={styles.primaryButton} type="submit">재생 완료</button>
                  </form>
                  <form action={cancelCurrent.bind(null, playing.id)} className={styles.pushEnd}>
                    <button className={styles.dangerButton} type="submit">선곡 취소</button>
                  </form>
                </div>
              </div>
            </div>
          </RequestCard>
        ) : <p className={styles.empty}>선곡된 노래가 없습니다. 플레이리스트에 곡을 담으면 바로 재생돼요.</p>}
      </section>

      <section className={styles.section} aria-labelledby="playlist-title">
        <div className={styles.sectionHeading}>
          <h2 id="playlist-title">플레이리스트</h2>
          <span className={styles.count}>{playlist.length}곡</span>
          <span className={styles.sectionHint}>위에서부터 차례로 재생돼요. ▲▼로 순서를 바꿀 수 있어요.</span>
        </div>
        {playlist.length > 0 ? (
          <div className={styles.cardList}>
            {playlist.map((request, index) => (
              <RequestCard
                key={request.id}
                tone="queued"
                badge={index === 0 ? "다음 곡" : `${index + 1}번`}
                songTitle={request.songTitle}
                artist={request.artist}
                requester={requester(request)}
                chip={{ label: "영상 연결됨", tone: "ok" }}
                side={(
                  <div className={styles.reorder}>
                    <form action={moveInPlaylist.bind(null, request.id, "up")}>
                      <button type="submit" disabled={index === 0} aria-label={`${request.songTitle} 위로 올리기`}>▲</button>
                    </form>
                    <form action={moveInPlaylist.bind(null, request.id, "down")}>
                      <button type="submit" disabled={index === playlist.length - 1} aria-label={`${request.songTitle} 아래로 내리기`}>▼</button>
                    </form>
                  </div>
                )}
              >
                <Story request={request} />
                <div className={styles.mediaRow}>
                  <MediaPreview request={request} />
                  <div className={styles.mediaSide}>
                    <div>
                      <p>{index === 0 ? "다음 차례로 재생돼요." : `${index + 1}번째로 재생돼요.`}</p>
                      <p className={styles.hint}>지금 재생하면 듣던 곡은 플레이리스트 맨 앞으로 돌아가요.</p>
                    </div>
                    <div className={styles.actions}>
                      <form action={playNow.bind(null, request.id)}>
                        <button className={styles.primaryButton} type="submit">지금 재생</button>
                      </form>
                      <form action={returnToInbox.bind(null, request.id)} className={styles.pushEnd}>
                        <button className={styles.dangerButton} type="submit">접수된 신청곡으로 되돌리기</button>
                      </form>
                      <form action={moveToPlayed.bind(null, request.id)}>
                        <button className={styles.outlineButton} type="submit">지난 선곡으로 빼기</button>
                      </form>
                    </div>
                  </div>
                </div>
              </RequestCard>
            ))}
          </div>
        ) : <p className={styles.empty}>플레이리스트가 비어 있어요. 아래 접수된 신청곡을 담아 주세요.</p>}
      </section>

      <section className={styles.section} aria-labelledby="inbox-title">
        <div className={styles.sectionHeading}>
          <h2 id="inbox-title">접수된 신청곡</h2>
          <span className={styles.count}>{inbox.length}곡</span>
          <span className={styles.sectionHint}>들어온 순서예요. 링크를 확인하고 플레이리스트에 담아 주세요.</span>
        </div>
        {inbox.length > 0 ? (
          <div className={styles.cardList}>
            {inbox.map((request, index) => (
              <RequestCard
                key={request.id}
                tone="pending"
                badge="접수"
                songTitle={request.songTitle}
                artist={request.artist}
                requester={requester(request)}
                chip={request.youtubeVideoId ? { label: "영상 연결됨", tone: "ok" } : { label: "링크 없음", tone: "muted" }}
                defaultOpen={index === 0}
              >
                <Story request={request} />
                <AddToPlaylistForm
                  requestId={request.id}
                  songTitle={request.songTitle}
                  initialVideoId={request.youtubeVideoId}
                  cancelSlot={<CancelRequestForm action={cancelRequest.bind(null, request.id)} songTitle={request.songTitle} />}
                />
              </RequestCard>
            ))}
          </div>
        ) : <p className={styles.empty}>새 신청곡이 없습니다.</p>}
      </section>

      {played.length > 0 && (
        <section className={styles.section} aria-labelledby="played-title">
          <div className={styles.sectionHeading}><h2 id="played-title">지난 선곡</h2></div>
          <ul className={styles.history}>
            {played.map((request) => (
              <li key={request.id}>
                <form action={returnToInbox.bind(null, request.id)}>
                  <button className={styles.dangerButton} type="submit" aria-label={`${request.songTitle} 접수된 신청곡으로 되돌리기`}>접수된 신청곡으로</button>
                </form>
                <span className={styles.historyTitle}>{request.songTitle} · {request.artist}</span>
                <span className={styles.historyTime}>{request.playedAt && requestedAtFormat.format(new Date(request.playedAt))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
