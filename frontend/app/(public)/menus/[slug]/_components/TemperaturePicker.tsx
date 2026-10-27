"use client";

import styles from "../../menus.module.css";

// 화면의 온도 값. 백엔드에 보낼 때 ice는 iced로 바꾼다(_actions.ts).
export type Temperature = "hot" | "ice";

const temperatureOptions: { value: Temperature; label: string; sub: string }[] = [
  { value: "hot", label: "따뜻하게", sub: "HOT" },
  { value: "ice", label: "시원하게", sub: "ICE" },
];

type Props = {
  label: string;
  options: Temperature[];
  value: Temperature | null;
  disabled: boolean;
  onChange: (value: Temperature) => void;
};

function TemperatureIcon({ type }: { type: Temperature }) {
  if (type === "hot") {
    return (
      <svg className={styles.tempIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4M16 3c-1 1.5 1 2.5 0 4" />
        <path d="M4 10h14v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-4z" />
        <path d="M18 11h1.5a2.5 2.5 0 0 1 0 5H17.5" />
      </svg>
    );
  }
  return (
    <svg className={styles.tempIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />
    </svg>
  );
}

export function TemperaturePicker({ label, options, value, disabled, onChange }: Props) {
  return (
    <div className={styles.orderField}>
      <span className={styles.orderLabel} id="temperature-label">
        {label}
      </span>
      <div
        className={styles.tempToggle}
        role="radiogroup"
        aria-labelledby="temperature-label"
      >
        {temperatureOptions
          .filter((option) => options.includes(option.value))
          .map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              disabled={disabled}
              data-temp={option.value}
              className={styles.tempOption}
              onClick={() => onChange(option.value)}
            >
              <TemperatureIcon type={option.value} />
              <span className={styles.tempText}>
                <span>{option.label}</span>
                <small>{option.sub}</small>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
