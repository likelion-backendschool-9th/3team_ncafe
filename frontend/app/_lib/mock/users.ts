import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { readMockData, writeMockData } from "./store";

export type Role = "customer" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
};

type StoredUser = User & {
  passwordHash: string;
  passwordSalt: string;
};

const fileName = "users.json";
const demoPassword = "demo1234!";

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function makeUser(name: string, email: string, role: Role, password: string): StoredUser {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    id: randomUUID(),
    name,
    email,
    role,
    status: "active",
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
  };
}

function users(): StoredUser[] {
  return readMockData(fileName, () => [
    makeUser("관리자", "admin@ncafe.local", "admin", demoPassword),
    makeUser("고객", "customer@ncafe.local", "customer", demoPassword),
  ]);
}

function toUser(stored: StoredUser): User {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    role: stored.role,
    status: stored.status,
  };
}

export function findMockUserById(id: string): User | null {
  const user = users().find((item) => item.id === id);
  return user && (user.role === "customer" || user.role === "admin") ? toUser(user) : null;
}

export function authenticateMockUser(email: string, password: string): User | null {
  const user = users().find((item) => item.email === email.trim().toLowerCase());
  if (!user || user.status !== "active" || (user.role !== "customer" && user.role !== "admin")) return null;

  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = Buffer.from(hashPassword(password, user.passwordSalt), "hex");
  return timingSafeEqual(expected, actual) ? toUser(user) : null;
}

export function createMockCustomer(name: string, email: string, password: string): User | null {
  const allUsers = users();
  const normalizedEmail = email.trim().toLowerCase();
  if (allUsers.some((user) => user.email === normalizedEmail)) return null;

  const newUser = makeUser(name.trim(), normalizedEmail, "customer", password);
  writeMockData(fileName, [...allUsers, newUser]);
  return toUser(newUser);
}
