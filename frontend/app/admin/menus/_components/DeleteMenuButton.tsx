"use client";

import type { FormEvent } from "react";
import styles from "../menus.module.css";

export function DeleteMenuButton({ action, name }: { action: () => Promise<void>; name: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`'${name}' 메뉴를 삭제할까요?`)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <button className={styles.deleteButton} type="submit">메뉴 삭제</button>
    </form>
  );
}
