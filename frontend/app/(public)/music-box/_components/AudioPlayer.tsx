"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "../music-box.module.css";

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function AudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // 서버에서 그린 <audio>는 하이드레이션 전에 메타데이터를 읽을 수 있어 onLoadedMetadata를 놓칠 수 있다.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= HTMLMediaElement.HAVE_METADATA) setDuration(audio.duration);
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function seek(value: string) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(value);
    setCurrent(audio.currentTime);
  }

  return (
    <div className={styles.player}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
      <input
        className={styles.progress}
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={(event) => seek(event.target.value)}
        aria-label={`${title} 재생 위치`}
        style={{ "--progress": `${duration ? (current / duration) * 100 : 0}%` } as CSSProperties}
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
