"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "../order-dashboard.module.css";

export function OrderSectionAccordion({
  title,
  description,
  count,
  tone,
  defaultOpen,
  children,
}: {
  title: string;
  description: string;
  count: number;
  tone: "active" | "completed" | "canceled";
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={`${styles.orderSection} ${styles[`${tone}Section`]}`} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionHeading}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className={styles.sectionChevron} aria-hidden="true">{open ? "−" : "+"}</span>
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionDescription}>{description}</span>
          <strong className={styles.sectionCount}>{count}건</strong>
        </button>
      </h2>
      <div id={`${id}-body`} className={styles.sectionBody} hidden={!open}>{children}</div>
    </section>
  );
}
