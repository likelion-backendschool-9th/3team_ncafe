import { Children, type ReactNode } from "react";
import type { SongResponse } from "@/app/_lib/songs/types";
import styles from "./request-memo.module.css";

const requestedAtFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function requestedAt(value: string): string {
  const parts = Object.fromEntries(requestedAtFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

const badgeToneClass = { accent: styles.queueBadgeNext, muted: styles.queueBadgeMuted, default: "" };

type RequestMemoBoardProps = {
  title: string;
  caption: string;
  titleLevel?: "h2" | "h3";
  empty: ReactNode;
  children: ReactNode;
};

// 나무 판에 신청곡 메모를 꽂아 두는 보드. 메모가 없으면 empty를 보여 준다.
export function RequestMemoBoard({ title, caption, titleLevel: Title = "h3", empty, children }: RequestMemoBoardProps) {
  return (
    <div className={styles.frontBoard}>
      <div className={styles.frontHead}>
        <Title>{title}</Title>
        <span>{caption}</span>
      </div>
      {Children.count(children) > 0 ? (
        <ol className={styles.memos}>{children}</ol>
      ) : (
        <p className={styles.emptyMemo}>{empty}</p>
      )}
    </div>
  );
}

type RequestMemoProps = {
  request: Pick<SongResponse, "songTitle" | "artist" | "story" | "requesterName" | "createdAt">;
  // 사연에 쓸 손글씨 폰트 클래스 (handwritingSequence)
  handwriting?: string;
  // 홈 메모처럼 순번 배지가 필요 없으면 비워 둔다.
  badge?: string;
  badgeTone?: keyof typeof badgeToneClass;
  showTime?: boolean;
  action?: ReactNode;
};

export function RequestMemo({ request, handwriting, badge, badgeTone = "default", showTime = true, action }: RequestMemoProps) {
  return (
    <li className={styles.memo}>
      {action && <div className={styles.memoAction}>{action}</div>}
      {badge && <span className={`${styles.queueBadge} ${badgeToneClass[badgeTone]}`}>{badge}</span>}
      <p className={`${styles.memoSong} ${badge ? styles.memoSongWithBadge : ""}`}>{request.songTitle} <small>· {request.artist}</small></p>
      <p className={`${styles.memoStory} ${handwriting ?? ""}`}>{request.story}</p>
      <p className={styles.memoMeta}>
        <span>— {request.requesterName}님의 사연</span>
        {showTime && <span>{requestedAt(request.createdAt)}</span>}
      </p>
    </li>
  );
}
