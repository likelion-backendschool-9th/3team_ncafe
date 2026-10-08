"use client";

import { useActionState } from "react";
import { startMusicRequest, type PlaybackFormState } from "../_actions";
import styles from "../music-box.module.css";

const initialState: PlaybackFormState = {};

export function PlaybackForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(startMusicRequest.bind(null, requestId), initialState);

  return (
    <form action={formAction} className={styles.playbackForm}>
      <label htmlFor={`audio-${requestId}`}>재생할 음원 주소 또는 파일</label>
      <div>
        <input
          id={`audio-${requestId}`}
          name="audioUrl"
          type="text"
          inputMode="url"
          placeholder="https://example.com/song.mp3"
          maxLength={2048}
          aria-invalid={!!state.error}
        />
        <button className="button" type="submit" disabled={pending}>{pending ? "선곡 중…" : "이 곡 선곡"}</button>
      </div>
      <input name="audioFile" type="file" accept=".mp3,.m4a,.ogg,.wav,audio/mpeg,audio/mp4,audio/ogg,audio/wav" aria-label="재생할 음원 파일" />
      <p className={styles.fileHint}>음원 파일을 선택하면 주소보다 우선 사용합니다. MP3·M4A·OGG·WAV, 최대 25MB.</p>
      {state.error && <p className={styles.formError} role="alert">{state.error}</p>}
    </form>
  );
}
