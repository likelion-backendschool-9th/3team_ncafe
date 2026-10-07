import type { ReactNode } from "react";
import { StatePanel } from "./StatePanel";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return <StatePanel eyebrow="내용 없음" title={title} description={description} action={action} />;
}
