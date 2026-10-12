"use server";

import { redirect } from "next/navigation";
import { authenticateMockUser, type Role } from "@/app/_lib/mock/users";
import { createSession } from "@/app/_lib/session/session";

const landingByRole: Record<Role, string> = {
  customer: "/",
  admin: "/admin",
};

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  return value;
}

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = authenticateMockUser(email, password);
  if (!user) redirect("/login?error=invalid");

  await createSession(user.id);
  redirect(safeNext(formData.get("next")) ?? landingByRole[user.role]);
}
