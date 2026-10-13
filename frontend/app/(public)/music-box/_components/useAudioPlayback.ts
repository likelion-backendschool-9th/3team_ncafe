"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

// 뮤직박스 페이지와 홈 DJ 부스가 같은 재생 동작(재생/일시정지, 위치 이동)을 쓰도록 묶는다.
export function useAudioPlayback() {
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

  const audioProps = {
    ref: audioRef,
    preload: "metadata" as const,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    // 마지막 timeupdate는 곡 끝보다 조금 앞에서 올 수 있어, 끝나면 재생 막대를 끝까지 채운다.
    onEnded: (event: SyntheticEvent<HTMLAudioElement>) => {
      setPlaying(false);
      setCurrent(event.currentTarget.duration);
    },
    onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => setCurrent(event.currentTarget.currentTime),
    onLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => setDuration(event.currentTarget.duration),
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return { audioProps, playing, current, duration, progress, toggle, seek };
}
