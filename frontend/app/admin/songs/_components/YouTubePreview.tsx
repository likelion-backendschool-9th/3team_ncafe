"use client";

import { useYouTubePlayback } from "@/app/_components/useYouTubePlayback";
import { youtubeWatchUrl } from "@/app/_lib/youtube";
import styles from "../music-box.module.css";

// 관리자는 YouTube 기본 조작 막대로 바로 확인한다. 외부 재생이 막힌 영상이면 안내를 띄운다.
// onDuration: 영상 길이를 읽으면 알려 준다. 플레이리스트에 담을 때 길이를 같이 저장하는 데 쓴다.
export function YouTubePreview({ videoId, title, onDuration }: { videoId: string; title: string; onDuration?: (seconds: number) => void }) {
  const { frameRef, error } = useYouTubePlayback(videoId, { controls: true, onDuration });

  return (
    <figure className={styles.preview}>
      <div ref={frameRef} className={styles.previewFrame} aria-label={`${title} 영상`} />
      <figcaption>
        {error && <span className={styles.formError} role="alert">{error} </span>}
        <a href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">YouTube에서 열기</a>
      </figcaption>
    </figure>
  );
}
