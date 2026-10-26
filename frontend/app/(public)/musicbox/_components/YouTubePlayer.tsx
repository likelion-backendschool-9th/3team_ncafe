"use client";

import type { CSSProperties } from "react";
import type { OnAir } from "@/app/_lib/mock/music-box";
import { finishPlaying, reportDuration } from "../_actions";
import styles from "../music-box.module.css";
import { clock, useYouTubePlayback } from "@/app/_components/useYouTubePlayback";
import { VolumeControl } from "@/app/_components/VolumeControl";

// LP 재킷 안에 들어가는 영상과 재생바. 재킷 틀은 NowPlaying이 그린다.
// 손님은 관리자가 튼 곡을 듣기만 하고 소리만 조절한다. 곡이 올라오면 저절로 재생되고, onAir(서버 재생 시각)에 맞춰 다른 손님과 같은 지점을 듣는다.
// 이 페이지에서 아직 아무것도 누르지 않았으면 브라우저 정책상 음소거로 재생되므로 "소리 켜기"를 보여 준다.
// 영상이 끝나면 이 곡(requestId)을 끝내고 플레이리스트 다음 곡으로 넘긴다.
export function YouTubePlayer({ requestId, videoId, title, onAir }: { requestId: string; videoId: string; title: string; onAir: OnAir | null }) {
  const { frameRef, ready, current, duration, progress, error, volume, soundBlocked, unmute } = useYouTubePlayback(videoId, {
    live: true,
    locked: true,
    sync: onAir,
    onEnded: () => void finishPlaying(requestId),
    // 길이를 모르는 곡이면 이 화면이 읽은 길이를 알려, 그 뒤로는 서버가 시간에 맞춰 넘기게 한다.
    onDuration: onAir?.durationSeconds ? undefined : (seconds) => void reportDuration(requestId, videoId, seconds),
  });

  return (
    <>
      <div ref={frameRef} className={styles.video} />
      {error && <p className={styles.playerError} role="alert">{error}</p>}
      <div className={styles.player}>
        <span className={styles.onAir} title="DJ가 튼 곡을 다른 손님들과 같이 듣고 있어요">ON AIR</span>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={`${title} 재생 위치`}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          aria-valuetext={`${clock(current)} / ${clock(duration)}`}
          style={{ "--progress": `${progress}%` } as CSSProperties}
        />
        {soundBlocked ? (
          <button className={styles.unmuteButton} type="button" onClick={unmute}>🔊 소리 켜기</button>
        ) : (
          <span className={styles.time}>{clock(current)} / {clock(duration)}</span>
        )}
        <VolumeControl title={title} level={volume.level} disabled={!ready} onChange={volume.change} onToggleMute={volume.toggleMute} />
      </div>
    </>
  );
}
