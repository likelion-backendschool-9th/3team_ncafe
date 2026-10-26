"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiRequestError, createAuthSession } from "@/app/_lib/api/auth";
import { safeNext } from "@/app/_lib/auth/navigation";
import type { Member } from "@/app/_lib/auth/types";

export type LoginFormState = {
  values: { email: string; next: string };
  errors: Partial<Record<"email" | "password", string>>;
  message: string;
  revision: number;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function login(previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const next = safeNext(formData.get("next")) ?? "";
  const state: LoginFormState = {
    values: { email, next }, errors: {}, message: "", revision: (previous?.revision ?? 0) + 1,
  };
  if (email.length > 254 || (email.includes("\0") || /[\uD800-\uDFFF]/u.test(email)) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    state.errors.email = "이메일 형식과 최대 254자 제한을 확인해 주세요.";
  }
  if ([...password].length < 8 || new TextEncoder().encode(password).length > 72 || /[\uD800-\uDFFF]/u.test(password)) {
    state.errors.password = "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.";
  }
  if (Object.keys(state.errors).length) return { ...state, message: "입력한 내용을 확인해 주세요." };

  let member: Member;
  try {
    const session = await createAuthSession();
    member = await session.login(email, password);
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    return {
      ...state,
      errors: error.code === "LOGIN_FAILED" ? { password: "이메일 또는 비밀번호를 확인해 주세요." } : {},
      message: error.message,
    };
  }
  (await cookies()).delete("ncafe_mock_session");
  revalidatePath("/", "layout");
  redirect(next || (member.role === "admin" ? "/admin" : "/"));
}
