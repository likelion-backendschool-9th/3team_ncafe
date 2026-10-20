"use client";

import type { CSSProperties } from "react";
import styles from "./volume-control.module.css";

type VolumeControlProps = {
  title: string;
  level: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggleMute: () => void;
};

// 재생바 끝에 붙는 볼륨 조절. 좁은 화면에서는 슬라이더를 숨기고 음소거 버튼만 남긴다.
export function VolumeControl({ title, level, disabled, onChange, onToggleMute }: VolumeControlProps) {
  const muted = level === 0;

  return (
    <div className={styles.volume}>
      <button
        className={styles.muteButton}
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={muted ? `${title} 소리 켜기` : `${title} 음소거`}
        aria-pressed={muted}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {muted ? (
            <path d="M16.5 9.5l5 5m0-5l-5 5" />
          ) : (
            <>
              <path d="M16 9a4 4 0 0 1 0 6" />
              {level > 50 && <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
            </>
          )}
        </svg>
      </button>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={100}
        step={5}
        value={level}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${title} 볼륨`}
        aria-valuetext={`${level}%`}
        style={{ "--level": `${level}%` } as CSSProperties}
      />
    </div>
  );
}
