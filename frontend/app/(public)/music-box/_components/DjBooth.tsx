"use client";

import type { CSSProperties } from "react";
import type { MusicRequest } from "@/app/_lib/mock/music-box";
import styles from "./music-box-highlight.module.css";
import { clock, useYouTubePlayback } from "./useYouTubePlayback";

type NowPlaying = Pick<MusicRequest, "songTitle" | "artist" | "story" | "requesterName" | "youtubeVideoId"> & {
  // 메모지에 적을 손글씨 폰트 클래스 (handwritingSequence)
  handwriting?: string;
};

const bulbColors = ["#e9503f", "#3f8fe0", "#4fc06a", "#f2c335"];
const topBulbs = Array.from({ length: 18 }, (_, index) => bulbColors[index % bulbColors.length]);
const bulbSideClass = { top: styles.bulbsTop, left: styles.bulbsLeft, right: styles.bulbsRight };
const sideBulbs = Array.from({ length: 6 }, (_, index) => bulbColors[(index + 2) % bulbColors.length]);

function Bulbs({ side }: { side: "top" | "left" | "right" }) {
  const colors = side === "top" ? topBulbs : sideBulbs;
  return (
    <div className={`${styles.bulbs} ${bulbSideClass[side]}`} aria-hidden="true">
      {colors.map((color, index) => (
        <span key={index} className={styles.bulb} style={{ "--bulb": color } as CSSProperties} />
      ))}
    </div>
  );
}

// DJ 부스: 책상 위 턴테이블에 LP 재킷(영상)을 얹고, 옆에 지금 곡의 신청곡 메모지를 둔다.
// YouTube 화면은 정책상 가리지 않아야 해서 재킷 앞면에 그대로 보이고, LP판은 재킷 뒤에서 반쯤 나와 돈다.
export function DjBooth({ nowPlaying, repeatOne = false }: { nowPlaying: NowPlaying | null; repeatOne?: boolean }) {
  const videoId = nowPlaying?.youtubeVideoId ?? null;
  const { frameRef, ready, playing, current, duration, progress, error, toggle, seek } = useYouTubePlayback(videoId, { loop: repeatOne });

  return (
    // 판과 톤암은 음악이 실제로 재생 중일 때만 움직인다. 일시정지하면 그 각도에서 멈춘다.
    <div className={styles.window} data-playing={playing}>
      <div className={styles.shelves} aria-hidden="true" />
      <span className={`${styles.faceOut} ${styles.faceOutLeft}`} aria-hidden="true" />
      <span className={`${styles.faceOut} ${styles.faceOutRight}`} aria-hidden="true" />
      <div className={styles.dim} aria-hidden="true" />

      <Bulbs side="top" />
      <Bulbs side="left" />
      <Bulbs side="right" />

      <svg className={styles.arc} viewBox="0 0 760 130" aria-hidden="true">
        <path id="music-box-arc" d="M 40 112 Q 380 -18 720 112" fill="none" />
        <text>
          <textPath href="#music-box-arc" startOffset="50%" textAnchor="middle">MUSIC BOX</textPath>
        </text>
      </svg>

      <div className={styles.desk} aria-hidden="true" />

      <div className={styles.stage}>
        <div className={styles.deck}>
          <div className={styles.platter} aria-hidden="true">
            <span className={styles.record}><span>SAMDABANG</span></span>
          </div>
          <span className={styles.tonearm} aria-hidden="true" />
          <span className={styles.speed} aria-hidden="true"><b>33</b><i>45</i></span>

          <article className={styles.sleeve} aria-labelledby="booth-now-title">
            <header className={styles.sleeveHead}>
              <div>
                <p className={styles.sleeveLabel}>NOW PLAYING</p>
                <h3 id="booth-now-title">{nowPlaying ? nowPlaying.songTitle : "잠시 쉬어 가는 시간이에요"}</h3>
              </div>
              {nowPlaying && <p className={styles.sleeveArtist}>{nowPlaying.artist}</p>}
            </header>
            {videoId ? (
              <div ref={frameRef} className={styles.video} />
            ) : (
              <p className={styles.videoEmpty}>
                {nowPlaying ? "영상을 준비하고 있어요." : "신청곡을 보내 주시면 DJ가 순서대로 틀어 드려요."}
              </p>
            )}
            {nowPlaying && videoId && (
              <div className={styles.player}>
                <button className={styles.playButton} type="button" onClick={toggle} disabled={!ready} aria-label={playing ? `${nowPlaying.songTitle} 일시정지` : `${nowPlaying.songTitle} 재생`}>
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
                  aria-label={`${nowPlaying.songTitle} 재생 위치`}
                  style={{ "--progress": `${progress}%` } as CSSProperties}
                />
                <span className={styles.time}>{clock(current)} / {clock(duration)}</span>
              </div>
            )}
            <footer className={styles.sleeveFoot}>
              {error ? (
                <span className={styles.sleeveError} role="alert">{error}</span>
              ) : (
                <>
                  <span>SAMDABANG RECORDS</span>
                  <b>STEREO · 1987</b>
                </>
              )}
            </footer>
          </article>
        </div>

        <article className={styles.slip} aria-label="지금 곡의 신청곡 메모">
          <span className={`${styles.tape} ${styles.tapeLeft}`} aria-hidden="true" />
          <span className={`${styles.tape} ${styles.tapeRight}`} aria-hidden="true" />
          <p className={styles.slipTitle}>신 청 곡</p>
          {nowPlaying ? (
            <>
              <p className={styles.slipLine}>
                <span>신 청 인</span>
                <strong className={nowPlaying.handwriting}>{nowPlaying.requesterName}</strong>
              </p>
              <div className={styles.slipStory}>
                <span>사 연</span>
                <p className={nowPlaying.handwriting}>{nowPlaying.story}</p>
              </div>
            </>
          ) : (
            <p className={styles.slipEmpty}>아직 도착한 사연이 없어요.</p>
          )}
          <footer className={styles.slipFoot}>
            <p>차와 음악이 있는~</p>
            <p className={styles.shopName}>삼 다 방 <span>☎ SINCE 1987</span></p>
          </footer>
        </article>
      </div>

      <span className={styles.deskLabel} aria-hidden="true">DJ BOOTH · 삼다방</span>
    </div>
  );
}
