"use client";

import type { CSSProperties } from "react";
import styles from "../music-box.module.css";
import { clock, useAudioPlayback } from "./useAudioPlayback";

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  const { audioProps, playing, current, duration, progress, toggle, seek } = useAudioPlayback();

  return (
    <div className={styles.player}>
      <audio src={src} {...audioProps} />
      <input
        className={styles.progress}
        type="range"
        min={0}
        max={duration || 0}
        step="any"
        value={current}
        onChange={(event) => seek(event.target.value)}
        aria-label={`${title} 재생 위치`}
        style={{ "--progress": `${progress}%` } as CSSProperties}
      />
      <div className={styles.time}>
        <span>{clock(current)}</span>
        <span>{clock(duration)}</span>
      </div>
      <button className={styles.playButton} type="button" onClick={toggle} aria-label={playing ? `${title} 일시정지` : `${title} 재생`}>
        {playing ? "❚❚" : "▶"}
      </button>
    </div>
  );
}
