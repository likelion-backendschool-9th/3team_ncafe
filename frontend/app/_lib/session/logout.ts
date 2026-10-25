"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAuthSession } from "../api/auth";

export async function logout(): Promise<void> {
  await (await createAuthSession()).logout();
  (await cookies()).delete("ncafe_mock_session");
  revalidatePath("/", "layout");
  redirect("/");
}
