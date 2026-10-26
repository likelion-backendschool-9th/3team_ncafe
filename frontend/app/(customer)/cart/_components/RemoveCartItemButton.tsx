"use client";

import { useTransition } from "react";
import { removeCartItem } from "../_actions";
import styles from "../cart.module.css";

type Props = {
  id: number;
  name: string;
  onError: (message: string | null) => void;
};

export function RemoveCartItemButton({ id, name, onError }: Props) {
  const [isPending, startRemoving] = useTransition();

  function remove() {
    onError(null);
    startRemoving(async () => {
      const result = await removeCartItem(id);
      if (!result.ok) onError(result.message);
    });
  }

  return (
    <button
      type="button"
      className={styles.removeButton}
      aria-label={`${name} 삭제`}
      disabled={isPending}
      onClick={remove}
    >
      {isPending ? "삭제 중..." : "삭제"}
    </button>
  );
}
