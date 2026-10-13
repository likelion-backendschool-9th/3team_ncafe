"use client";

import styles from "../../menus.module.css";
import { useGoBack } from "./useGoBack";

export function BackButton() {
  const goBack = useGoBack();

  return (
    <button type="button" className={styles.backButton} onClick={goBack}>
      <span aria-hidden="true">←</span> 뒤로 가기
    </button>
  );
}
