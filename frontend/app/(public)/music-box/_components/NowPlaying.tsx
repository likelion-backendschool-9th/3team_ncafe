import type { MusicRequest } from "@/app/_lib/mock/music-box";
import styles from "../music-box.module.css";
import { YouTubePlayer } from "./YouTubePlayer";

type NowPlayingProps = {
  playing: MusicRequest | undefined;
  next: MusicRequest | undefined;
  repeatOne?: boolean;
};

export function NowPlaying({ playing, next, repeatOne = false }: NowPlayingProps) {
  return (
    <section className={`${styles.panel} ${styles.nowPanel}`} aria-labelledby="playing-title">
      <h2 id="playing-title" className={styles.panelTitle}>
        <span className={styles.panelIcon} aria-hidden="true">◉</span>
        지금 나오는 음악
        {playing && <span className={styles.onAir}>ON AIR</span>}
      </h2>

      {playing ? (
        <>
          <div className={styles.cover}>
            <span className={styles.vinyl} aria-hidden="true" />
            <div>
              <h3>{playing.songTitle}</h3>
              <p>{playing.artist}</p>
            </div>
          </div>
          {playing.youtubeVideoId ? (
            <YouTubePlayer videoId={playing.youtubeVideoId} title={playing.songTitle} loop={repeatOne} />
          ) : (
            <p className={styles.empty}>영상을 준비하고 있어요.</p>
          )}
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
