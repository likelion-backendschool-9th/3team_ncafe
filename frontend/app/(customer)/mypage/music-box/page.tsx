import Link from "next/link";
import { mockMusicBoxRepository, waitingQueueOf, type MusicRequest } from "@/app/_lib/mock/music-box";
import { requireRole } from "@/app/_lib/session/session";
import { DjBooth } from "@/app/(public)/music-box/_components/DjBooth";
import { handwritingSequence } from "@/app/(public)/music-box/_components/handwriting";
import boothStyles from "@/app/(public)/music-box/_components/music-box-highlight.module.css";
import { RequestMemo, RequestMemoBoard } from "@/app/(public)/music-box/_components/RequestMemo";
import styles from "../mypage.module.css";
import { deleteMyMusicRequest } from "./_actions";
import { DeleteRequestForm } from "./_components/DeleteRequestForm";

type SearchParams = Promise<{ deleted?: string; error?: string }>;

const statusOrder: Record<MusicRequest["status"], number> = { playing: 0, queued: 1, pending: 1, played: 2, cancelled: 3 };

function statusBadge(request: MusicRequest, position: number | undefined): string {
  if (request.status === "playing") return "재생 중";
  if (request.status === "played") return "재생 완료";
  if (request.status === "cancelled") return "취소됨";
  return `대기 ${position}`;
}

export default async function MyMusicRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, { deleted, error }, requests, repeat] = await Promise.all([
    requireRole("customer", "/mypage/music-box"),
    searchParams,
    mockMusicBoxRepository.list(),
    mockMusicBoxRepository.getRepeatMode(),
  ]);

  const playing = requests.find((request) => request.status === "playing");
  const queue = waitingQueueOf(requests);
  const queuePosition = new Map(queue.map((request, index) => [request.id, index + 1]));
  // 내 신청곡은 재생 중 → 대기(차례 순) → 재생 완료(최근 신청 순) → 취소됨으로 보여 준다.
  const mine = requests
    .filter((request) => request.userId === user.id)
    .sort((a, b) =>
      statusOrder[a.status] - statusOrder[b.status] ||
      (queuePosition.get(a.id) ?? 0) - (queuePosition.get(b.id) ?? 0),
    );
  // 내 메모는 모두 내 글씨 하나로, 다른 손님의 곡이 재생 중이면 메모지는 다른 글씨로 적는다.
  const [myHand, otherHand] = handwritingSequence(user.id, 2);

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <nav className={styles.breadcrumb} aria-label="현재 위치">
        <Link href="/mypage">마이페이지</Link>
        <span aria-hidden="true">/</span>
        <span>신청곡 · 사연</span>
      </nav>

      <header className={styles.heading}>
        <p className={styles.eyebrow}>MUSIC BOX · 나의 신청곡</p>
        <h1>보낸 신청곡과 사연</h1>
        <p>뮤직박스에 남긴 신청곡이 지금 어디쯤 흘러가고 있는지 확인하세요.</p>
      </header>

      {deleted === "1" && <p className={styles.notice} role="status">신청곡과 사연을 삭제했습니다.</p>}
      {error === "delete" && <p className={styles.error} role="alert">신청곡을 삭제하지 못했습니다. 재생 중인 곡은 삭제할 수 없어요.</p>}

      <section aria-label="뮤직박스">
        <div className={boothStyles.frame}>
          <DjBooth
            nowPlaying={playing ? {
              songTitle: playing.songTitle,
              artist: playing.artist,
              story: playing.story,
              requesterName: playing.requesterName,
              youtubeVideoId: playing.youtubeVideoId,
              handwriting: playing.userId === user.id ? myHand : otherHand,
            } : null}
            repeatOne={repeat === "one"}
          />
        </div>

        <RequestMemoBoard
          title="내가 보낸 신청곡"
          titleLevel="h2"
          caption={`총 ${mine.length}곡 · 재생 중인 곡은 삭제할 수 없어요`}
          empty={<>아직 보낸 신청곡이 없어요. <Link href="/music-box">신청곡 보내러 가기 →</Link></>}
        >
          {mine.map((request) => (
            <RequestMemo
              key={request.id}
              request={request}
              handwriting={myHand}
              badge={statusBadge(request, queuePosition.get(request.id))}
              badgeTone={request.status === "playing" ? "accent" : request.status === "played" || request.status === "cancelled" ? "muted" : "default"}
              action={request.status !== "playing" && (
                <DeleteRequestForm action={deleteMyMusicRequest.bind(null, request.id)} songTitle={request.songTitle} />
              )}
            />
          ))}
        </RequestMemoBoard>
      </section>
    </div>
  );
}
