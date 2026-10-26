"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiRequestError, createAuthSession } from "@/app/_lib/api/auth";
import { safeNext } from "@/app/_lib/auth/navigation";
import type { Member } from "@/app/_lib/auth/types";

export type SignupFormState = {
  values: { name: string; email: string; next: string };
  errors: Partial<Record<"name" | "email" | "password" | "passwordConfirm", string>>;
  message: string;
  revision: number;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signup(previous: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const name = text(formData, "name").trim();
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const passwordConfirm = text(formData, "passwordConfirm");
  const next = safeNext(formData.get("next")) ?? "";
  const state: SignupFormState = {
    values: { name, email, next }, errors: {}, message: "", revision: (previous?.revision ?? 0) + 1,
  };
  if ([...name].length < 2 || [...name].length > 50 || (name.includes("\0") || /[\uD800-\uDFFF]/u.test(name))) {
    state.errors.name = "닉네임은 올바른 문자로 2~50자 입력해 주세요.";
  }
  if (email.length > 254 || (email.includes("\0") || /[\uD800-\uDFFF]/u.test(email)) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    state.errors.email = "이메일 형식과 최대 254자 제한을 확인해 주세요.";
  }
  if ([...password].length < 8 || new TextEncoder().encode(password).length > 72 || /[\uD800-\uDFFF]/u.test(password)) {
    state.errors.password = "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.";
  }
  if (!passwordConfirm || password !== passwordConfirm) {
    state.errors.passwordConfirm = "비밀번호 확인이 일치하지 않습니다.";
  }
  if (Object.keys(state.errors).length) return { ...state, message: "입력한 내용을 확인해 주세요." };

  let session: Awaited<ReturnType<typeof createAuthSession>>;
  try {
    session = await createAuthSession();
    await session.signup({ name, email, password, passwordConfirm });
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    return { ...state, errors: error.status === 409 ? { email: error.message } : {}, message: error.message };
  }

  let member: Member | null = null;
  try {
    member = await session.login(email, password);
  } catch {
    // The account already exists; continue with login rather than submitting signup again.
  }
  (await cookies()).delete("ncafe_mock_session");
  revalidatePath("/", "layout");
  if (!member) redirect(`/login?registered=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  redirect(next || (member.role === "admin" ? "/admin" : "/"));
}
