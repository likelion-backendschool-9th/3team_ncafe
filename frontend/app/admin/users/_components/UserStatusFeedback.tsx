"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "../users.module.css";

const UserStatusFeedbackContext = createContext<((message: string) => void) | null>(null);

export function useUserStatusFeedback(): ((message: string) => void) | null {
  return useContext(UserStatusFeedbackContext);
}

export function UserStatusFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  return (
    <UserStatusFeedbackContext.Provider value={setMessage}>
      {message && <p className={styles.notice} role="status">{message}</p>}
      {children}
    </UserStatusFeedbackContext.Provider>
  );
}
