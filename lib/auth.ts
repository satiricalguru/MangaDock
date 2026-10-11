import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "ni_session";
const SESSION_DAYS = 30;

export interface User {
  id: number;
  email: string;
  name: string;
  hue: number;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await db().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Safe to call from any server component or route. */
export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = (await db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.hue, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token)) as (User & { expires_at: number }) | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, name: row.name, hue: row.hue };
}
