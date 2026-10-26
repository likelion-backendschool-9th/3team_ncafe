import { changeAdminOrderStatus, changeAdminOrderStatusFromDetail } from "../_actions";
import { orderCode } from "../_lib/format";
import { serializeOrderQuery, type OrderQuery } from "../_lib/searchParams";
import { statusLabels, type AdminOrderResponse } from "../_lib/types";
import { StatusChangeForm } from "./StatusChangeForm";
import styles from "../order-dashboard.module.css";

type Props = { order: AdminOrderResponse; query: OrderQuery; detail?: boolean };
export function OrderStatusControl({ order, query, detail = false }: Props) {
  if (!order.allowedStatuses.length) {
    return <span className={`${styles.badge} ${styles[order.status]}`}>{statusLabels[order.status]}</span>;
  }
  const action = detail ? changeAdminOrderStatusFromDetail : changeAdminOrderStatus;
  return <StatusChangeForm key={`${order.id}-${order.statusVersion}`}
    action={action.bind(null, order.id, order.status, order.statusVersion, serializeOrderQuery(query))}
    orderCode={orderCode(order.id)} status={order.status} allowedStatuses={order.allowedStatuses} />;
}
