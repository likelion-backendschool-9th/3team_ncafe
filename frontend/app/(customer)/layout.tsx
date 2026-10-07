import type { ReactNode } from "react";
import { requireRole } from "@/app/_lib/session/session";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireRole("customer", "/cart");
  return <main className="container page-content">{children}</main>;
}
