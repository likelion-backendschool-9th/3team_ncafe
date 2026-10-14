"use client";

import type { CSSProperties } from "react";
import styles from "../music-box.module.css";
import { clock, useYouTubePlayback } from "./useYouTubePlayback";

// LP 재킷 안에 들어가는 영상과 재생바. 재킷 틀은 NowPlaying이 그린다.
export function YouTubePlayer({ videoId, title, loop = false }: { videoId: string; title: string; loop?: boolean }) {
  const { frameRef, ready, playing, current, duration, progress, error, toggle, seek } = useYouTubePlayback(videoId, { loop });

  return (
    <>
      <div ref={frameRef} className={styles.video} />
      {error && <p className={styles.playerError} role="alert">{error}</p>}
      <div className={styles.player}>
        <button className={styles.playButton} type="button" onClick={toggle} disabled={!ready} aria-label={playing ? `${title} 일시정지` : `${title} 재생`}>
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          className={styles.progress}
          type="range"
          min={0}
          max={duration || 0}
          step="any"
          value={current}
          disabled={!ready}
          onChange={(event) => seek(event.target.value)}
          aria-label={`${title} 재생 위치`}
          style={{ "--progress": `${progress}%` } as CSSProperties}
        />
        <span className={styles.time}>{clock(current)} / {clock(duration)}</span>
      </div>
    </>
  );
}
