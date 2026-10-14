"use client";

import type { CSSProperties } from "react";
import type { MusicRequest } from "@/app/_lib/mock/music-box";
import styles from "./music-box-highlight.module.css";
import { clock, useYouTubePlayback } from "./useYouTubePlayback";

type NowPlaying = Pick<MusicRequest, "songTitle" | "artist" | "story" | "requesterName" | "youtubeVideoId">;

const bulbColors = ["#e9503f", "#3f8fe0", "#4fc06a", "#f2c335"];
const topBulbs = Array.from({ length: 18 }, (_, index) => bulbColors[index % bulbColors.length]);
const bulbSideClass = { top: styles.bulbsTop, left: styles.bulbsLeft, right: styles.bulbsRight };
const sideBulbs = Array.from({ length: 6 }, (_, index) => bulbColors[(index + 2) % bulbColors.length]);
// 책장 위 3칸에만 앞면이 보이는 LP를 양 끝에 하나씩 둔다.
const faceOutCovers = [
  ["#2f5d6b", "#6b4a8c"],
  ["#6b4a8c", "#b5552f"],
  ["#b5552f", "#4a6b3a"],
];

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

export function DjBooth({ nowPlaying, repeatOne = false }: { nowPlaying: NowPlaying | null; repeatOne?: boolean }) {
  // 판은 음악이 실제로 재생 중일 때만 돈다. 일시정지하면 그 각도에서 멈춘다.
  const videoId = nowPlaying?.youtubeVideoId ?? null;
  const { frameRef, ready, playing, current, duration, progress, error, toggle, seek } = useYouTubePlayback(videoId, { loop: repeatOne });

  return (
    <div className={styles.window} data-playing={playing}>
      <div className={styles.shelves} aria-hidden="true">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className={styles.shelfRow} style={{ "--shift": `${row * 37}px` } as CSSProperties}>
            {faceOutCovers[row]?.map((color, index) => (
              <span key={index} className={`${styles.faceOut} ${index === 0 ? styles.faceOutLeft : styles.faceOutRight}`} style={{ "--cover": color } as CSSProperties} />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.warmLight} aria-hidden="true" />

      <Bulbs side="top" />
      <Bulbs side="left" />
      <Bulbs side="right" />

      <svg className={styles.arc} viewBox="0 0 760 130" aria-hidden="true">
        <path id="music-box-arc" d="M 40 112 Q 380 -18 720 112" fill="none" />
        <text>
          <textPath href="#music-box-arc" startOffset="50%" textAnchor="middle">MUSIC BOX</textPath>
        </text>
      </svg>

      <article className={`${styles.board} ${videoId ? styles.boardWithVideo : ""}`} aria-labelledby="booth-now-title">
        {nowPlaying && <span className={styles.onAir}>ON AIR</span>}
        {videoId && <div ref={frameRef} className={styles.video} />}
        <div className={styles.boardText}>
          <p className={styles.boardLabel}>지금 흐르는 노래</p>
          {nowPlaying ? (
            <>
              <h3 id="booth-now-title" className={styles.boardTitle}>
                {nowPlaying.songTitle} <span>· {nowPlaying.artist}</span>
              </h3>
              <blockquote className={styles.boardStory}>
                {nowPlaying.story}
                <cite>— {nowPlaying.requesterName}님의 사연</cite>
              </blockquote>
            </>
          ) : (
            <>
              <h3 id="booth-now-title" className={styles.boardTitle}>잠시 쉬어 가는 시간이에요</h3>
              <p className={styles.boardNote}>신청곡을 보내 주시면 DJ가 순서대로 틀어 드려요.</p>
            </>
          )}
          {nowPlaying && !videoId && <p className={styles.boardNote}>영상을 준비하고 있어요.</p>}
          {error && <p className={styles.boardNote} role="alert">{error}</p>}
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
        </div>
      </article>

      <div className={styles.desk} aria-hidden="true" />
      <div className={styles.turntable} aria-hidden="true">
        <span className={styles.platter}><span className={styles.record} /></span>
        <span className={styles.tonearm} />
        <span className={styles.deckKnob} />
      </div>
      <div className={styles.amp} aria-hidden="true">
        <span className={styles.vu}><i /></span>
        <span className={styles.vu}><i /></span>
        <span className={styles.ampKnobs}><b /><b /><b /><b /></span>
      </div>
      <span className={styles.headphones} aria-hidden="true" />
      <span className={styles.mic} aria-hidden="true"><i /><b /><span /></span>
      <span className={styles.lamp} aria-hidden="true"><i /><b /><span /></span>
      <span className={styles.deskLabel} aria-hidden="true">DJ BOOTH · 삼다방</span>
    </div>
  );
}
