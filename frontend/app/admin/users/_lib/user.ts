export const USER_ROLES = ["customer", "admin"] as const;
export const USER_STATUSES = ["active", "suspended"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export type UserResponse = { id: number; name: string; email: string; role: UserRole; status: UserStatus };
export type UserPageResponse = { items: UserResponse[]; page: number; size: number; totalElements: number; totalPages: number };
export type UserSummaryResponse = { totalCount: number; activeCount: number; suspendedCount: number };

export const roleLabels: Record<UserRole, string> = { customer: "회원", admin: "관리자" };
export const statusLabels: Record<UserStatus, string> = { active: "정상", suspended: "이용 정지" };

export const isUserRole = (value: unknown): value is UserRole => (USER_ROLES as readonly unknown[]).includes(value);
export const isUserStatus = (value: unknown): value is UserStatus => (USER_STATUSES as readonly unknown[]).includes(value);
