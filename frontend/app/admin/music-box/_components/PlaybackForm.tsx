"use client";

import { useActionState } from "react";
import { startMusicRequest, type PlaybackFormState } from "../_actions";
import styles from "../music-box.module.css";

const initialState: PlaybackFormState = {};

export function PlaybackForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(startMusicRequest.bind(null, requestId), initialState);

  return (
    <form action={formAction} className={styles.playbackForm}>
      <label htmlFor={`youtube-${requestId}`}>YouTube 링크</label>
      <div>
        <input
          id={`youtube-${requestId}`}
          name="youtubeUrl"
          type="text"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          maxLength={2048}
          required
          aria-invalid={!!state.error}
        />
        <button className="button" type="submit" disabled={pending}>{pending ? "선곡 중…" : "이 곡 선곡"}</button>
      </div>
      <p className={styles.fileHint}>youtube.com, youtu.be, 쇼츠 링크를 그대로 붙여 넣으면 돼요.</p>
      {state.error && <p className={styles.formError} role="alert">{state.error}</p>}
    </form>
  );
}
