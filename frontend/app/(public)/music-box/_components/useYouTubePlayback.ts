"use client";

import { useEffect, useRef, useState } from "react";

// YouTube IFrame Player API 중 뮤직박스가 쓰는 부분만 타입으로 둔다.
type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
};

type YouTubePlayerOptions = {
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady: (event: { target: YouTubePlayer }) => void;
    onStateChange: (event: { data: number; target: YouTubePlayer }) => void;
    onError: (event: { data: number }) => void;
  };
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// https://developers.google.com/youtube/iframe_api_reference#Events
const PLAYING = 1;
const ENDED = 0;
const EMBED_BLOCKED = new Set([101, 150]);

let apiReady: Promise<YouTubeNamespace> | null = null;

// 이 화면에서 곡이 끝까지 재생돼 다음 곡으로 넘어갈 때만, 새로 뜨는 다음 곡을 바로 이어서 튼다.
let continueWithNext = false;

// IFrame API 스크립트는 페이지에 플레이어가 여러 개 있어도 한 번만 불러온다.
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiReady ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.append(script);
  });
  return apiReady;
}

// 손님이 맞춘 볼륨은 브라우저에 기억해 두고, 다음 곡과 새로고침 뒤에도 그대로 쓴다.
const VOLUME_KEY = "music-box-volume";
const DEFAULT_SOUND = { volume: 80, muted: false };

type Sound = typeof DEFAULT_SOUND;

function readSound(): Sound {
  try {
    const saved = JSON.parse(window.localStorage.getItem(VOLUME_KEY) ?? "null") as Partial<Sound> | null;
    if (typeof saved?.volume !== "number") return DEFAULT_SOUND;
    return { volume: Math.min(100, Math.max(0, saved.volume)), muted: saved.muted === true };
  } catch {
    return DEFAULT_SOUND;
  }
}

function saveSound(sound: Sound) {
  try {
    window.localStorage.setItem(VOLUME_KEY, JSON.stringify(sound));
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 적용한다.
  }
}

function applySound(player: YouTubePlayer, { volume, muted }: Sound) {
  player.setVolume(volume);
  if (muted) player.mute();
  else player.unMute();
}

export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

// 뮤직박스 페이지와 DJ 부스가 같은 YouTube 재생 동작(재생/일시정지, 위치 이동)을 쓰도록 묶는다.
// 플레이어 화면은 YouTube 정책상 가리거나 숨기면 안 되므로, frameRef를 붙인 칸을 그대로 보여 줘야 한다.
// onEnded: 영상이 끝까지 재생되면 부른다. 뮤직박스는 여기서 플레이리스트 다음 곡으로 넘긴다.
export function useYouTubePlayback(videoId: string | null, { controls = false, onEnded }: { controls?: boolean; onEnded?: () => void } = {}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  // 콜백이 바뀌어도 플레이어를 새로 만들지 않도록 최신 값만 따로 들고 있는다.
  const onEndedRef = useRef(onEnded);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound>(DEFAULT_SOUND);

  useEffect(() => {
    const frame = frameRef.current;
    if (!videoId || !frame) return;

    // YouTube가 이 요소를 iframe으로 바꿔 끼우므로, React가 관리하는 칸 안에 따로 만든 요소를 넘긴다.
    const mount = document.createElement("div");
    frame.append(mount);
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { controls: controls ? 1 : 0, playsinline: 1, rel: 0 },
        events: {
          onReady: ({ target }) => {
            const saved = readSound();
            applySound(target, saved);
            setSound(saved);
            setReady(true);
            setDuration(target.getDuration());
            if (continueWithNext) {
              continueWithNext = false;
              target.playVideo();
            }
          },
          onStateChange: ({ data, target }) => {
            if (data === ENDED && onEndedRef.current) {
              continueWithNext = true;
              onEndedRef.current();
            }
            setPlaying(data === PLAYING);
            setDuration(target.getDuration());
            // 마지막으로 읽은 시간은 곡 끝보다 조금 앞일 수 있어, 끝나면 재생 막대를 끝까지 채운다.
            setCurrent(data === ENDED ? target.getDuration() : target.getCurrentTime());
          },
          onError: ({ data }) => {
            setError(EMBED_BLOCKED.has(data)
              ? "이 영상은 다른 사이트에서 재생할 수 없어요."
              : "영상을 불러오지 못했어요.");
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      frame.replaceChildren();
      setReady(false);
      setPlaying(false);
      setCurrent(0);
      setDuration(0);
      setError(null);
    };
  }, [videoId, controls]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // IFrame API는 재생 시간 변화를 알려 주지 않아서, 재생 중에만 0.5초마다 읽어 온다.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (player) setCurrent(player.getCurrentTime());
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  function toggle() {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  function seek(value: string) {
    const player = playerRef.current;
    if (!player || !ready) return;
    player.seekTo(Number(value), true);
    setCurrent(Number(value));
  }

  function changeSound(next: Sound) {
    const player = playerRef.current;
    if (!player || !ready) return;
    applySound(player, next);
    setSound(next);
    saveSound(next);
  }

  // 슬라이더를 움직이면 음소거는 풀고, 0까지 내리면 음소거와 같게 본다.
  function changeVolume(value: string) {
    const volume = Number(value);
    changeSound({ volume, muted: volume === 0 });
  }

  // 볼륨 0에서 음소거를 풀면 들리지 않으니 기본 볼륨으로 되돌린다.
  function toggleMute() {
    if (sound.muted || sound.volume === 0) {
      changeSound({ volume: sound.volume || DEFAULT_SOUND.volume, muted: false });
    } else {
      changeSound({ ...sound, muted: true });
    }
  }

  const progress = duration ? (current / duration) * 100 : 0;
  const volume = { level: sound.muted ? 0 : sound.volume, change: changeVolume, toggleMute };

  return { frameRef, ready, playing, current, duration, progress, error, toggle, seek, volume };
}
