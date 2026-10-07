"use client";

import type { FormEvent } from "react";
import styles from "../menus.module.css";

export function DeleteMenuButton({ action, name, label = "메뉴 삭제" }: { action: () => Promise<void>; name: string; label?: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`'${name}' 메뉴를 삭제할까요?`)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <button className={styles.deleteButton} type="submit">{label}</button>
    </form>
  );
}
