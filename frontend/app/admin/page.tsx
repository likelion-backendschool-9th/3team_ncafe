import { requireRole } from "@/app/_lib/session/session";
import { DashboardHeading } from "./_components/DashboardHeading";
import { ManagementCards } from "./_components/ManagementCards";
import { MenuSummary } from "./_components/MenuSummary";
import { getMenuSummary, getOrderSummary, getSongSummary } from "./_lib/api";
import styles from "./admin.module.css";

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [menuSummary, orderSummary, songSummary] = await Promise.all([getMenuSummary(), getOrderSummary(), getSongSummary()]);

  return (
    <div className={styles.page}>
      <DashboardHeading />
      <MenuSummary summary={menuSummary} />
      <ManagementCards activeOrderCount={orderSummary.activeCount} pendingSongCount={songSummary.pendingCount} />
    </div>
  );
}
