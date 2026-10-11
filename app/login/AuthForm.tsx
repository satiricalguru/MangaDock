"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { login, signup, type AuthState } from "./actions";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const LEVELS = [
  { label: "Too short", color: "bg-white/20" },
  { label: "Weak", color: "bg-magenta" },
  { label: "Okay", color: "bg-[#ffb02e]" },
  { label: "Strong", color: "bg-cyan" },
  { label: "Unbreakable", color: "bg-lime" },
];

export default function AuthForm({ next, initialMode }: { next: string; initialMode: "login" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [pw, setPw] = useState("");
  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;
  const lvl = pw.length < 8 ? 0 : Math.max(1, strength(pw));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setPw("");
    setShow(false);
  };

  const input =
    "peer w-full rounded-2xl border border-white/10 bg-white/5 px-4 pb-2.5 pt-6 text-base outline-none transition duration-300 placeholder:text-transparent focus:border-magenta focus:bg-white/10 focus:ring-4 focus:ring-magenta/20 aria-invalid:border-magenta";
  const floatLabel =
    "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-mist transition-all duration-300 ease-glide peer-focus:top-3.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-magenta peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest";

  return (
    <div className="neon-border page-in relative w-full max-w-md rounded-[32px]">
      <div className="relative rounded-[32px] p-7 sm:p-10">
        <div role="tablist" aria-label="Account" className="relative grid grid-cols-2 rounded-full bg-white/5 p-1 text-sm font-semibold">
          <span
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-magenta shadow-[0_0_30px_-6px_#ff2e95] transition-transform duration-500 ease-glide"
            style={{ transform: mode === "login" ? "translateX(4px)" : "translateX(calc(100% + 4px))" }}
          />
          <button type="button" role="tab" onClick={() => switchMode("login")} className="press relative min-h-11 py-2.5" aria-selected={mode === "login"}>
            Log in
          </button>
          <button type="button" role="tab" onClick={() => switchMode("signup")} className="press relative min-h-11 py-2.5" aria-selected={mode === "signup"}>
            Sign up
          </button>
        </div>

        <div key={`h-${mode}`} className="page-in">
          <h1 className="mt-8 font-display text-3xl font-black italic">
            {mode === "login" ? (
              <>
                Welcome <span className="text-neon">back</span>
              </>
            ) : (
              <>
                Join the <span className="text-neon">crew</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm text-mist">
            {mode === "login" ? "Pick up right where you left off." : "Free forever. Track every series and jump back to the exact page."}
          </p>
        </div>

        <form key={mode} action={mode === "login" ? loginAction : signupAction} className="page-in mt-7 space-y-3.5" noValidate={false}>
          <input type="hidden" name="next" value={next} />
          {mode === "signup" && (
            <div className="relative">
              <input id="f-name" name="name" required minLength={2} maxLength={32} defaultValue={state.fields?.name} placeholder="Display name" className={input} autoComplete="nickname" />
              <label htmlFor="f-name" className={floatLabel}>Display name</label>
            </div>
          )}
          <div className="relative">
            <input id="f-email" name="email" type="email" required defaultValue={state.fields?.email} placeholder="Email" className={input} autoComplete="email" inputMode="email" aria-invalid={!!state.error || undefined} />
            <label htmlFor="f-email" className={floatLabel}>Email</label>
          </div>
          <div>
            <div className="relative">
              <input
                id="f-pw"
                name="password"
                type={show ? "text" : "password"}
                required
                minLength={mode === "signup" ? 8 : 1}
                placeholder="Password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={onKey}
                onKeyUp={onKey}
                onBlur={() => setCaps(false)}
                className={`${input} pr-14`}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                aria-invalid={!!state.error || undefined}
                aria-describedby="pw-hint"
              />
              <label htmlFor="f-pw" className={floatLabel}>Password</label>
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                className="press absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-mist transition hover:bg-white/10 hover:text-paper"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M4 4l16 16" className={`origin-center transition-[stroke-dashoffset] duration-300 [stroke-dasharray:23] ${show ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:23]"}`} />
                </svg>
              </button>
            </div>
            <div id="pw-hint" aria-live="polite" className="min-h-0">
              {caps && <p className="page-in mt-2 text-xs font-semibold text-[#ffb02e]">⇪ Caps Lock is on</p>}
              {mode === "signup" && pw.length > 0 && (
                <div className="page-in mt-2.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 rounded-full transition-colors duration-500 ${i <= lvl ? LEVELS[lvl].color : "bg-white/10"}`} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-mist">
                    Strength: <span className="font-semibold text-paper">{LEVELS[lvl].label}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          {state.error && (
            <p role="alert" className="shake rounded-2xl border border-magenta/40 bg-magenta/10 px-4 py-3 text-sm text-paper">
              {state.error}
            </p>
          )}
          <button
            disabled={pending}
            className="press group relative mt-2 w-full overflow-hidden rounded-full bg-paper py-3.5 font-semibold text-ink transition hover:bg-lime hover:shadow-[0_0_40px_-8px_#c6ff3d] disabled:opacity-70"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
            <span className="relative inline-flex items-center justify-center gap-2">
              {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden />}
              {pending ? "One sec…" : mode === "login" ? "Log in" : "Create account"}
              {!pending && <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>}
            </span>
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-mist/70">
          {mode === "login" ? (
            <>New here? <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-cyan underline-offset-4 hover:underline">Create a free account</button></>
          ) : (
            <>Already reading with us? <button type="button" onClick={() => switchMode("login")} className="font-semibold text-cyan underline-offset-4 hover:underline">Log in</button></>
          )}
        </p>
        <p className="mt-3 text-center text-[11px] text-mist/60">Progress on this device syncs to your account when you log in.</p>
      </div>
    </div>
  );
}
