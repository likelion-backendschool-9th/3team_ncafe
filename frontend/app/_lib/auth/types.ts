export type Role = "customer" | "admin";
export type Member = { id: number; name: string; email: string; role: Role; status: "active" | "suspended" };

export function parseMember(value: unknown): Member {
  if (!value || typeof value !== "object") throw new Error("회원 응답을 확인할 수 없습니다.");
  const member = value as Record<string, unknown>;
  if (typeof member.id !== "number" || !Number.isSafeInteger(member.id) || member.id <= 0
    || typeof member.name !== "string" || typeof member.email !== "string"
    || (member.role !== "customer" && member.role !== "admin")
    || (member.status !== "active" && member.status !== "suspended")) {
    throw new Error("회원 응답을 확인할 수 없습니다.");
  }
  return { id: member.id, name: member.name, email: member.email, role: member.role, status: member.status };
}
