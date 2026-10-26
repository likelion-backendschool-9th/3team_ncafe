import type { CurrentSong, OnAir, SongResponse } from "@/app/_lib/songs/types";
import styles from "../music-box.module.css";
import { YouTubePlayer } from "./YouTubePlayer";

type NowPlayingProps = {
  playing: CurrentSong | null;
  onAir: OnAir | null;
  next: SongResponse | undefined;
};

export function NowPlaying({ playing, onAir, next }: NowPlayingProps) {
  return (
    <section className={`${styles.panel} ${styles.nowPanel}`} aria-labelledby="playing-title">
      <h2 id="playing-title" className={styles.panelTitle}>
        <span className={styles.panelIcon} aria-hidden="true">◉</span>
        지금 나오는 음악
      </h2>

      {playing ? (
        <>
          {/* 홈 DJ 부스와 같은 LP 재킷: 앞면에 곡명과 YouTube 화면, 재생바를 담는다. */}
          <article className={styles.sleeve}>
            <header className={styles.sleeveHead}>
              <div>
                <p className={styles.sleeveLabel}>NOW PLAYING</p>
                <h3>{playing.songTitle}</h3>
              </div>
              <p className={styles.sleeveArtist}>{playing.artist}</p>
            </header>
            {playing.youtubeVideoId ? (
              <YouTubePlayer key={playing.id} videoId={playing.youtubeVideoId} title={playing.songTitle} onAir={onAir} />
            ) : (
              <p className={styles.videoEmpty}>영상을 준비하고 있어요.</p>
            )}
            <footer className={styles.sleeveFoot}>
              <span>SAMDABANG RECORDS</span>
              <b>STEREO · 1987</b>
            </footer>
          </article>
          <blockquote className={styles.letter}>
            {playing.story}
            <cite>— {playing.requesterName}님의 사연</cite>
          </blockquote>
        </>
      ) : (
        <p className={styles.empty}>아직 선곡된 노래가 없습니다. 첫 신청곡을 남겨 주세요.</p>
      )}

      {next && (
        <div className={styles.upNext}>
          <span className={styles.upNextBadge}>NEXT</span>
          <div>
            <strong>{next.songTitle}</strong> · {next.artist}
            <small>{next.requesterName}님의 신청곡</small>
          </div>
        </div>
      )}
    </section>
  );
}
