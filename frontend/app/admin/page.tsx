import { mockMenuRepository } from "@/app/_lib/mock/menus";
import { mockMusicBoxRepository } from "@/app/_lib/mock/music-box";
import { mockOrderRepository } from "@/app/_lib/mock/orders";
import { requireRole } from "@/app/_lib/session/session";
import { DashboardHeading } from "./_components/DashboardHeading";
import { ManagementCards } from "./_components/ManagementCards";
import { MenuSummary } from "./_components/MenuSummary";
import styles from "./admin.module.css";

export default async function AdminPage() {
  await requireRole("admin", "/admin");
  const [menus, musicRequests, orders] = await Promise.all([mockMenuRepository.list(), mockMusicBoxRepository.list(), mockOrderRepository.listAll()]);
  const availableCount = menus.filter((menu) => menu.available).length;
  const pendingMusicCount = musicRequests.filter((request) => request.status === "pending").length;
  const activeOrderCount = orders.filter((order) => order.status === "received" || order.status === "preparing").length;

  return (
    <div className={styles.page}>
      <DashboardHeading />
      <MenuSummary total={menus.length} available={availableCount} />
      <ManagementCards activeOrderCount={activeOrderCount} pendingSongCount={pendingMusicCount} />
    </div>
  );
}
