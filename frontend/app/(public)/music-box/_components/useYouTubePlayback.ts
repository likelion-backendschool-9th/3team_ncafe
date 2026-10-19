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
    // 브라우저가 소리 나는 자동재생을 막았을 때 부른다.
    onAutoplayBlocked: (event: { target: YouTubePlayer }) => void;
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

// 손님 화면 재생 위치가 서버 기준과 이만큼(초) 벌어지면 다시 맞춘다. 너무 작으면 버퍼링 때마다 건너뛴다.
const DRIFT_LIMIT_SECONDS = 2.5;
// 재생 중에는 0.5초마다 시간을 읽는데, 그중 몇 번에 한 번씩 서버 기준 위치와 비교한다. (3초)
const DRIFT_CHECK_EVERY = 6;

let apiReady: Promise<YouTubeNamespace> | null = null;

// 손님 플레이어는 관리자가 튼 곡을 저절로 재생한다.
// 브라우저는 사용자가 이 페이지에서 한 번이라도 누른 뒤에만 소리 나는 재생을 허락하고, 그 허락은 새로고침 전까지 유지된다.
// 아직 누른 적이 없으면 음소거로 틀고 "소리 켜기"를 보여 준다. 손님이 직접 멈추면 다음 곡도 저절로 틀지 않는다.
let soundUnlocked = false;
let stoppedByUser = false;

function canPlaySound(): boolean {
  const activation = navigator.userActivation as UserActivation | undefined;
  return soundUnlocked || activation?.hasBeenActive === true;
}

// 서버 시각 기준으로 지금 곡이 몇 초째여야 하는지 계산하는 데 쓰는 값. offset은 (서버 시각 - 손님 기기 시각)이다.
export type PlaybackSync = { startedAt: string; serverNow: number };
type SyncState = { startedAt: number; offset: number };

function livePosition(sync: SyncState | null): number | null {
  if (!sync) return null;
  return (Date.now() + sync.offset - sync.startedAt) / 1000;
}

// 서버 기준 위치와 많이 벌어졌을 때만 옮긴다. 광고·버퍼링·일시정지 뒤에도 다른 손님과 같은 지점으로 돌아온다.
// 서버 기준으로 이미 끝난 곡이면 옮기지 않고, 다음 곡으로 바뀌기를 기다린다.
function keepInSync(player: YouTubePlayer, sync: SyncState | null) {
  const position = livePosition(sync);
  if (position === null) return;
  const length = player.getDuration();
  if (length && position >= length) return;
  if (Math.abs(player.getCurrentTime() - position) > DRIFT_LIMIT_SECONDS) player.seekTo(Math.max(0, position), true);
}

function startLive(player: YouTubePlayer, sync: SyncState | null) {
  const position = livePosition(sync);
  const length = player.getDuration();
  if (position !== null && length && position >= length) return;
  if (position !== null && position > 1) player.seekTo(position, true);
  player.playVideo();
}

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

type PlaybackOptions = {
  // YouTube 기본 조작 막대를 보여 줄지. 관리자 미리보기에서만 켠다.
  controls?: boolean;
  // 뮤직박스 플레이어. 관리자가 튼 곡을 서버 시각에 맞춰 저절로 재생하고, 위치는 옮길 수 없다.
  live?: boolean;
  // 지금 곡의 재생 시작 시각. 없으면(예전 데이터) 처음부터 튼다.
  sync?: PlaybackSync | null;
  // 영상이 끝까지 재생되면 부른다.
  onEnded?: () => void;
  // 영상 길이를 처음 읽었을 때 부른다.
  onDuration?: (seconds: number) => void;
};

// 뮤직박스 페이지와 DJ 부스, 관리자 미리보기가 같은 YouTube 재생 동작을 쓰도록 묶는다.
// 플레이어 화면은 YouTube 정책상 가리거나 숨기면 안 되므로, frameRef를 붙인 칸을 그대로 보여 줘야 한다.
export function useYouTubePlayback(videoId: string | null, { controls = false, live = false, sync = null, onEnded, onDuration }: PlaybackOptions = {}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  // 콜백·시각이 바뀌어도 플레이어를 새로 만들지 않도록 최신 값만 따로 들고 있는다.
  const onEndedRef = useRef(onEnded);
  const onDurationRef = useRef(onDuration);
  const liveRef = useRef(live);
  const syncRef = useRef<SyncState | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound>(DEFAULT_SOUND);
  // 브라우저 정책 때문에 음소거로 틀고 있는지. 손님이 고른 볼륨·음소거 설정과는 따로 둔다.
  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!videoId || !frame) return;

    // YouTube가 이 요소를 iframe으로 바꿔 끼우므로, React가 관리하는 칸 안에 따로 만든 요소를 넘긴다.
    const mount = document.createElement("div");
    frame.append(mount);
    let cancelled = false;
    let durationReported = false;

    function reportDuration(player: YouTubePlayer) {
      const length = player.getDuration();
      if (durationReported || !(length > 0)) return;
      durationReported = true;
      onDurationRef.current?.(length);
    }

    // 소리를 낼 수 없는 페이지면 음소거로 먼저 튼다. 소리를 켜면 그때 손님이 고른 볼륨으로 돌아간다.
    function autoStart(player: YouTubePlayer) {
      const blocked = !canPlaySound();
      if (blocked) player.mute();
      setSoundBlocked(blocked);
      startLive(player, syncRef.current);
    }

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
            reportDuration(target);
            if (liveRef.current && !stoppedByUser) autoStart(target);
          },
          onStateChange: ({ data, target }) => {
            if (data === ENDED) onEndedRef.current?.();
            if (data === PLAYING && liveRef.current) keepInSync(target, syncRef.current);
            reportDuration(target);
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
          // 소리를 낼 수 있다고 봤는데도 막혔으면 음소거로 다시 튼다.
          onAutoplayBlocked: ({ target }) => {
            if (!liveRef.current) return;
            target.mute();
            setSoundBlocked(true);
            target.playVideo();
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
      setSoundBlocked(false);
    };
  }, [videoId, controls]);

  useEffect(() => {
    onEndedRef.current = onEnded;
    onDurationRef.current = onDuration;
    liveRef.current = live;
  }, [onEnded, onDuration, live]);

  // 화면이 새로 그려질 때마다 서버 시각이 같이 오므로, 그때 손님 기기 시계와의 차이를 다시 잰다.
  const startedAt = sync?.startedAt;
  const serverNow = sync?.serverNow;
  useEffect(() => {
    syncRef.current = startedAt !== undefined && serverNow !== undefined
      ? { startedAt: Date.parse(startedAt), offset: serverNow - Date.now() }
      : null;
  }, [startedAt, serverNow]);

  // IFrame API는 재생 시간 변화를 알려 주지 않아서, 재생 중에만 0.5초마다 읽어 온다.
  // 손님 플레이어는 몇 번에 한 번씩 서버 기준 위치와 비교해 벌어졌으면 다시 맞춘다.
  useEffect(() => {
    if (!playing) return;
    let ticks = 0;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      ticks += 1;
      if (liveRef.current && ticks % DRIFT_CHECK_EVERY === 0) keepInSync(player, syncRef.current);
      setCurrent(player.getCurrentTime());
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  // 손님은 위치를 옮길 수 없다. 멈췄다가 다시 들으면 다른 손님들이 듣는 지점부터 이어서 나온다.
  // 직접 멈추면 다음 곡도 저절로 틀지 않고, 다시 들으면 그때부터 다시 이어서 튼다.
  function toggle() {
    const player = playerRef.current;
    if (!player || !ready) return;
    if (playing) {
      if (live) stoppedByUser = true;
      player.pauseVideo();
    } else if (live) {
      stoppedByUser = false;
      unlockSound(player, sound);
      startLive(player, syncRef.current);
    } else {
      player.playVideo();
    }
  }

  // 손님이 누른 순간부터는 소리를 낼 수 있으므로, 고른 볼륨·음소거 설정대로 되돌린다.
  function unlockSound(player: YouTubePlayer, next: Sound) {
    soundUnlocked = true;
    applySound(player, next);
    setSoundBlocked(false);
  }

  function unmute() {
    const player = playerRef.current;
    if (!player || !ready) return;
    unlockSound(player, sound);
  }

  function changeSound(next: Sound) {
    const player = playerRef.current;
    if (!player || !ready) return;
    unlockSound(player, next);
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
  const volume = { level: sound.muted || soundBlocked ? 0 : sound.volume, change: changeVolume, toggleMute };

  return { frameRef, ready, playing, current, duration, progress, error, toggle, volume, soundBlocked, unmute };
}
