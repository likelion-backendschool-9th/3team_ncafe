"use client";

import { clock, useYouTubePlayback } from "@/app/_components/useYouTubePlayback";
import { VolumeControl } from "@/app/_components/VolumeControl";
import { finishCurrent } from "../_actions";
import type { OnAir } from "@/app/_lib/songs/types";
import { youtubeWatchUrl } from "@/app/_lib/youtube";
import styles from "../music-box.module.css";

// 현재 선곡은 손님 화면과 같은 방식으로 서버 시각에 맞춰 저절로 재생한다.
// 관리자가 곡을 올리며 이 페이지에서 버튼을 눌렀으므로 보통 소리도 같이 나오고, 페이지를 새로 열었으면 음소거로 시작한다.
export function OnAirPlayer({ requestId, videoId, title, onAir }: { requestId: number; videoId: string; title: string; onAir: OnAir | null }) {
  const { frameRef, ready, playing, current, duration, error, volume, soundBlocked, unmute } = useYouTubePlayback(videoId, {
    live: true,
    sync: onAir,
    // 길이를 모르는 곡은 서버가 시간으로 넘기지 못하므로, 영상이 끝나면 관리자 화면이 종료를 알린다.
    // 서버가 이미 넘긴 곡이면 백엔드가 무시한다.
    onEnded: () => void finishCurrent(requestId),
  });

  return (
    <figure className={styles.preview}>
      <div ref={frameRef} className={styles.previewFrame} aria-label={`${title} 영상`} />
      <figcaption className={styles.onAirBar}>
        <span>{playing ? "재생 중" : "준비 중"} · {clock(current)} / {clock(duration)}</span>
        {soundBlocked && <button className={styles.soundButton} type="button" onClick={unmute}>🔊 소리 켜기</button>}
        <VolumeControl title={title} level={volume.level} disabled={!ready} onChange={volume.change} onToggleMute={volume.toggleMute} />
        {error && <span className={styles.formError} role="alert">{error}</span>}
        <a href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">YouTube에서 열기</a>
      </figcaption>
    </figure>
  );
}
