"use server";

import { redirect } from "next/navigation";
import { createMockCustomer } from "@/app/_lib/mock/users";
import { createSession } from "@/app/_lib/session/session";

export async function signup(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) {
    redirect("/signup?error=invalid");
  }
  if (password !== passwordConfirm) redirect("/signup?error=mismatch");

  const user = createMockCustomer(name, email, password);
  if (!user) redirect("/signup?error=exists");

  await createSession(user.id);
  redirect("/");
}
