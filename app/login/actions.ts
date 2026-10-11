"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export interface AuthState {
  error?: string;
  fields?: { email?: string; name?: string };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/library";
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fields = { email, name };
  if (!EMAIL.test(email)) return { error: "Enter a valid email address.", fields };
  if (name.length < 2 || name.length > 32) return { error: "Pick a display name between 2 and 32 characters.", fields };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", fields };

  const exists = await db().prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) return { error: "That email already has an account. Log in instead.", fields };

  const hue = Math.floor(Math.random() * 360);
  const { lastInsertRowid } = await db()
    .prepare("INSERT INTO users (email, name, password_hash, hue, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(email, name, hashPassword(password), hue, Date.now());
  await createSession(Number(lastInsertRowid));
  redirect(safeNext(form.get("next")) + (safeNext(form.get("next")).includes("?") ? "&" : "?") + "welcome=1");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const row = (await db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email)) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Email or password is wrong.", fields: { email } };
  }
  await createSession(row.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
