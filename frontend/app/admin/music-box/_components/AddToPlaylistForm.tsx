"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { parseYouTubeVideoId } from "@/app/_lib/youtube";
import { addToPlaylist, type PlaylistFormState } from "../_actions";
import styles from "../music-box.module.css";
import { YouTubePreview } from "./YouTubePreview";

const initialState: PlaylistFormState = {};

type AddToPlaylistFormProps = {
  requestId: string;
  songTitle: string;
  // 플레이리스트에서 뺐던 곡이면 붙어 있던 영상 ID로 미리보기를 바로 보여 준다.
  initialVideoId: string | null;
  // 담기 버튼 옆에 둘 신청 취소 폼. 폼 안에 폼을 넣을 수 없어 따로 받는다.
  cancelSlot: ReactNode;
};

export function AddToPlaylistForm({ requestId, songTitle, initialVideoId, cancelSlot }: AddToPlaylistFormProps) {
  const [state, formAction, pending] = useActionState(addToPlaylist.bind(null, requestId), initialState);
  const [link, setLink] = useState(initialVideoId ? `https://youtu.be/${initialVideoId}` : "");
  const [previewId, setPreviewId] = useState(initialVideoId);
  const [linkError, setLinkError] = useState<string | null>(null);
  const formId = useId();
  const inputId = useId();

  function preview() {
    const videoId = parseYouTubeVideoId(link);
    setPreviewId(videoId);
    setLinkError(videoId ? null : "YouTube 영상 링크가 아니에요. 링크를 다시 확인해 주세요.");
  }

  return (
    <>
      <form id={formId} action={formAction} className={styles.linkField}>
        <label htmlFor={inputId}>YouTube 링크</label>
        <div>
          <input
            id={inputId}
            name="youtubeUrl"
            type="text"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            maxLength={2048}
            required
            value={link}
            onChange={(event) => {
              // 링크를 바꾸면 다시 미리보기로 확인한 뒤에 담을 수 있다.
              setLink(event.target.value);
              if (parseYouTubeVideoId(event.target.value) !== previewId) setPreviewId(null);
            }}
            aria-invalid={!!(linkError || state.error)}
          />
          <button className={styles.outlineButton} type="button" onClick={preview}>미리보기</button>
        </div>
        {(linkError || state.error) && <p className={styles.formError} role="alert">{linkError ?? state.error}</p>}
      </form>

      <div className={styles.mediaRow}>
        {previewId ? (
          <YouTubePreview videoId={previewId} title={songTitle} />
        ) : (
          <div className={styles.previewEmpty}>링크를 넣고 미리보기를 눌러 주세요.</div>
        )}
        <div className={styles.mediaSide}>
          <div>
            <p>신청곡과 같은 노래인지, 재생이 되는지 확인해 주세요.</p>
            <p className={styles.hint}>담으면 플레이리스트 맨 끝에 들어가요.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.primaryButton} type="submit" form={formId} disabled={pending || !previewId}>
              {pending ? "담는 중…" : "플레이리스트에 담기"}
            </button>
            {cancelSlot}
          </div>
        </div>
      </div>
    </>
  );
}
