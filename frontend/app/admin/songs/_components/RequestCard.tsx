"use client";

import { useState, type ReactNode } from "react";
import styles from "../music-box.module.css";

type Tone = "playing" | "queued" | "pending";
type ChipTone = "accent" | "ok" | "muted";

type RequestCardProps = {
  tone: Tone;
  badge: string;
  songTitle: string;
  artist: string;
  requester: string;
  chip?: { label: string; tone: ChipTone };
  defaultOpen?: boolean;
  // 요약 줄 오른쪽 끝(순서 변경 버튼 자리). 없어도 칸을 비워 두어 카드끼리 정렬을 맞춘다.
  side?: ReactNode;
  children: ReactNode;
};

const toneClass: Record<Tone, string> = { playing: styles.cardPlaying, queued: styles.cardQueued, pending: styles.cardPending };
const chipClass: Record<ChipTone, string> = { accent: styles.chipAccent, ok: styles.chipOk, muted: styles.chipMuted };

// 현재 선곡·플레이리스트·접수함이 같이 쓰는 카드. 요약 줄을 누르면 사연과 영상, 버튼이 펼쳐진다.
// 펼쳤을 때만 내용을 그려서, 접힌 카드의 YouTube 플레이어는 만들지 않는다.
export function RequestCard({ tone, badge, songTitle, artist, requester, chip, defaultOpen = false, side, children }: RequestCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <article className={`${styles.card} ${toneClass[tone]}`}>
      <div className={styles.cardHead}>
        <button className={styles.cardToggle} type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span className={styles.cardBadge}>{badge}</span>
          <span className={styles.cardTitle}>
            <strong>{songTitle}</strong> <span>— {artist}</span>
          </span>
          <span className={styles.cardMeta}>{requester}</span>
          <span>{chip && <span className={`${styles.chip} ${chipClass[chip.tone]}`}>{chip.label}</span>}</span>
          <svg className={styles.chevron} aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
            <path d="M4 7 L9 12 L14 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className={styles.cardSide}>{side}</div>
      </div>
      {open && <div className={styles.cardBody}>{children}</div>}
    </article>
  );
}
