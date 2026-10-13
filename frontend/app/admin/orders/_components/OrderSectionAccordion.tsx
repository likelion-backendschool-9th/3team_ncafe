"use client";

import { useState, type ReactNode } from "react";
import styles from "../order-dashboard.module.css";

export function OrderSectionAccordion({
  title,
  description,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  description: string;
  count: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={styles.orderSection}>
      <h2 className={styles.sectionHeading}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className={styles.sectionChevron} aria-hidden="true">{open ? "−" : "+"}</span>
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionDescription}>{description}</span>
          <strong className={styles.sectionCount}>{count}건</strong>
        </button>
      </h2>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}
