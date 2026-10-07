import type { ReactNode } from "react";

type StatePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function StatePanel({ eyebrow, title, description, action }: StatePanelProps) {
  return (
    <section className="state-panel" aria-live="polite">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <p>{description}</p>
      {action && <div className="state-panel__action">{action}</div>}
    </section>
  );
}
