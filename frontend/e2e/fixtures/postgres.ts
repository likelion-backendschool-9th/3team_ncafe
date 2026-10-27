import { execFileSync } from "node:child_process";

// Only the dedicated disposable DB is writable. Existing Docker setup remains the default.
export function testDatabase(sql: string): string {
  const local = process.env.E2E_TEST_DB_URL;
  if (local) {
    const url = new URL(local);
    if (url.protocol !== "postgresql:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || url.pathname !== "/ncafe_auth_e2e" || url.username !== "ncafe_test" || url.search) {
      throw new Error("전용 localhost ncafe_auth_e2e DB만 사용할 수 있습니다.");
    }
  }
  const command = local ? "psql" : "docker";
  const args = local ? [local] : ["exec", process.env.E2E_PG_CONTAINER ?? "ncafe-auth-e2e-pg", "psql", "-U", "ncafe_test", "-d", "ncafe_auth_e2e"];
  const query = (value: string) => execFileSync(command, [...args, "-qAt", "-v", "ON_ERROR_STOP=1", "-c", value], { encoding: "utf8" }).trim();
  if (query("select current_database() || ':' || current_user") !== "ncafe_auth_e2e:ncafe_test") {
    throw new Error("테스트 DB 이름과 사용자가 일치하지 않습니다.");
  }
  return query(sql);
}

export const sqlText = (value: string): string => `'${value.replaceAll("'", "''")}'`;
