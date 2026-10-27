import Link from "next/link";
import styles from "../admin.module.css";

type Props = {
  label: string;
  title: string;
  // 제목 뒤에 강조할 처리 건수. 예: { value: 3, unit: "건" } → "처리할 주문 3건"
  count?: { value: number; unit: string };
  description: string;
  href: string;
  linkLabel: string;
  tone: "red" | "teal";
};

export function ManagementCard({ label, title, count, description, href, linkLabel, tone }: Props) {
  const titleId = `${href.slice(1).replaceAll("/", "-")}-title`;
  return (
    <section className={`${styles.card} ${tone === "red" ? styles.cardRed : styles.cardTeal}`} aria-labelledby={titleId}>
      <p className={styles.cardLabel}>{label}</p>
      <h2 id={titleId}>
        {title}
        {count && <> <strong className={styles.count}>{count.value}</strong>{count.unit}</>}
      </h2>
      <p>{description}</p>
      <Link className={styles.cardLink} href={href}>{linkLabel}</Link>
    </section>
  );
}
