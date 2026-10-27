import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { mockOrderRepository } from "@/app/_lib/mock/orders";
import { requireRole } from "@/app/_lib/session/session";
import { DashboardHeading } from "./_components/DashboardHeading";
import { ManagementCards } from "./_components/ManagementCards";
import { MenuSummary } from "./_components/MenuSummary";
import { getMenuSummary } from "./_lib/api";
import styles from "./admin.module.css";

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [menuSummary, musicRequests, orders] = await Promise.all([getMenuSummary(), mockMusicBoxRepository.list(), mockOrderRepository.listAll()]);
  const pendingMusicCount = musicRequests.filter((request) => request.status === "pending").length;
  const activeOrderCount = orders.filter((order) => order.status === "received" || order.status === "preparing").length;

  return (
    <div className={styles.page}>
      <DashboardHeading />
      <MenuSummary summary={menuSummary} />
      <ManagementCards activeOrderCount={activeOrderCount} pendingSongCount={pendingMusicCount} />
    </div>
  );
}
