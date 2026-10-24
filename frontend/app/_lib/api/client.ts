import "server-only";
import { cookies } from "next/headers";

export type ApiError = { code: string; message: string };

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly error: ApiError) {
    super(error.message);
  }
}

const fallbackError: ApiError = { code: "UNKNOWN", message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };

async function readError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "code" in body && "message" in body
      && typeof body.code === "string" && typeof body.message === "string") {
      return { code: body.code, message: body.message };
    }
  } catch {
    // 본문이 JSON이 아니면 기본 오류로 처리한다.
  }
  return fallbackError;
}

// 서버 간 호출에는 브라우저 쿠키가 자동으로 붙지 않으므로 직접 넣는다.
export async function apiFetch<T>(path: `/api/v1/${string}`, init: RequestInit = {}): Promise<T> {
  const origin = process.env.API_ORIGIN;
  if (!origin) throw new Error("API_ORIGIN 환경변수가 설정되지 않았습니다.");

  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", cookie: (await cookies()).toString(), ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new ApiRequestError(response.status, await readError(response));
  return response.status === 204 ? (undefined as T) : response.json();
}
