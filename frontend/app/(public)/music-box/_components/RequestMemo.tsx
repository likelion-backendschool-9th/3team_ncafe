import { Children, type ReactNode } from "react";
import type { MusicRequest } from "@/app/_lib/mock/music-box";
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
  request: Pick<MusicRequest, "songTitle" | "artist" | "story" | "requesterName" | "createdAt">;
  badge: string;
  badgeTone?: keyof typeof badgeToneClass;
  action?: ReactNode;
};

export function RequestMemo({ request, badge, badgeTone = "default", action }: RequestMemoProps) {
  return (
    <li className={styles.memo}>
      {action && <div className={styles.memoAction}>{action}</div>}
      <span className={`${styles.queueBadge} ${badgeToneClass[badgeTone]}`}>{badge}</span>
      <p className={styles.memoSong}>{request.songTitle} <small>· {request.artist}</small></p>
      <p className={styles.memoStory}>{request.story}</p>
      <p className={styles.memoMeta}>
        <span>— {request.requesterName}님의 사연</span>
        <span>{requestedAt(request.createdAt)}</span>
      </p>
    </li>
  );
}
