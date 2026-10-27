"use client";

import styles from "../cart.module.css";

type Props = {
  count: number;
  allSelected: boolean;
  onToggleAll: (selected: boolean) => void;
};

export function CartToolbar({ count, allSelected, onToggleAll }: Props) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.selectAll}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => onToggleAll(event.target.checked)}
        />
        전체 선택
      </label>
      <span>{count}개 담음</span>
    </div>
  );
}
