"use client";

import { useYouTubePlayback } from "@/app/(public)/music-box/_components/useYouTubePlayback";
import { youtubeWatchUrl } from "@/app/_lib/youtube";
import styles from "../music-box.module.css";

// 관리자는 YouTube 기본 조작 막대로 바로 확인한다. 외부 재생이 막힌 영상이면 안내를 띄운다.
export function YouTubePreview({ videoId, title }: { videoId: string; title: string }) {
  const { frameRef, error } = useYouTubePlayback(videoId, { controls: true });

  return (
    <figure className={styles.preview}>
      <div ref={frameRef} className={styles.previewFrame} aria-label={`${title} 영상`} />
      <figcaption>
        {error ? <span className={styles.formError} role="alert">{error}</span> : "손님 화면에 나가는 영상이에요."}
        {" "}<a href={youtubeWatchUrl(videoId)} target="_blank" rel="noreferrer">YouTube에서 열기</a>
      </figcaption>
    </figure>
  );
}
