"use client";

import { useEffect, useRef, useState } from "react";

type SpeechStatus = "idle" | "loading" | "speaking" | "error";
type SpeechSession = {
  controller: AbortController;
  audio: HTMLAudioElement | null;
  objectUrl: string | null;
};

const SPEECH_VOLUME_BOOST = 1.15;

function speechVolume(level: number) {
  return Math.max(0, Math.min(1, (level / 100) * SPEECH_VOLUME_BOOST));
}

function stopSession(session: SpeechSession) {
  session.controller.abort();
  session.audio?.pause();
  if (session.objectUrl) URL.revokeObjectURL(session.objectUrl);
}

export function useStorySpeech(requestId: number | null, volumeLevel: number) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionRef = useRef<SpeechSession | null>(null);
  const volumeRef = useRef(volumeLevel);

  useEffect(() => {
    return () => {
      if (sessionRef.current) stopSession(sessionRef.current);
      sessionRef.current = null;
    };
  }, [requestId]);

  useEffect(() => {
    volumeRef.current = volumeLevel;
    if (sessionRef.current?.audio) sessionRef.current.audio.volume = speechVolume(volumeLevel);
  }, [volumeLevel]);

  async function toggle() {
    if (!requestId) return;

    if (sessionRef.current) {
      stopSession(sessionRef.current);
      sessionRef.current = null;
      setStatus("idle");
      return;
    }

    const session: SpeechSession = { controller: new AbortController(), audio: null, objectUrl: null };
    sessionRef.current = session;
    setErrorMessage(null);
    setStatus("loading");

    try {
      const response = await fetch("/api/story-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
        signal: session.controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "사연을 읽지 못했어요. 다시 시도해 주세요.");
      }
      const blob = await response.blob();
      if (sessionRef.current !== session) return;

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      session.objectUrl = objectUrl;
      session.audio = audio;
      audio.volume = speechVolume(volumeRef.current);
      audio.onended = () => {
        if (sessionRef.current !== session) return;
        stopSession(session);
        sessionRef.current = null;
        setStatus("idle");
      };
      audio.onerror = () => {
        if (sessionRef.current !== session) return;
        stopSession(session);
        sessionRef.current = null;
        setErrorMessage("음성을 재생하지 못했어요. 다시 시도해 주세요.");
        setStatus("error");
      };
      await audio.play();
      if (sessionRef.current === session) setStatus("speaking");
    } catch (error) {
      if (sessionRef.current !== session) return;
      stopSession(session);
      sessionRef.current = null;
      setErrorMessage(error instanceof Error ? error.message : "사연을 읽지 못했어요. 다시 시도해 주세요.");
      setStatus("error");
    }
  }

  return { status, errorMessage, toggle };
}
