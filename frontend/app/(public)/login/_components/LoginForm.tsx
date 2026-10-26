"use client";

import { useActionState, useEffect, useRef } from "react";
import { login, type LoginFormState } from "../_actions/login";

type Props = { next: string | null };

export function LoginForm({ next }: Props) {
  const initial: LoginFormState = { values: { email: "", next: next ?? "" }, errors: {}, message: "", revision: 0 };
  const [state, action, pending] = useActionState(login, initial);
  const form = useRef<HTMLFormElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!state.revision) return;
    const invalid = form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else if (state.message) message.current?.focus();
  }, [state]);

  return (
    <form ref={form} action={action} className="form-stack" noValidate aria-busy={pending}>
      <input type="hidden" name="next" value={state.values.next} />
      <p ref={message} className={state.message ? "form-error" : undefined} role="alert" tabIndex={-1} hidden={!state.message}>
        {state.message}
      </p>
      <label htmlFor="login-email">
        이메일
        <input id="login-email" name="email" type="email" autoComplete="email" maxLength={254}
          required defaultValue={state.values.email} aria-invalid={!!state.errors.email}
          aria-describedby={state.errors.email ? "login-email-error" : undefined} />
      </label>
      {state.errors.email && <span id="login-email-error" className="form-error">{state.errors.email}</span>}
      <label htmlFor="login-password">
        비밀번호
        <input id="login-password" name="password" type="password" autoComplete="current-password"
          required aria-invalid={!!state.errors.password}
          aria-describedby={state.errors.password ? "login-password-error" : undefined} />
      </label>
      {state.errors.password && <span id="login-password-error" className="form-error">{state.errors.password}</span>}
      <button className="button" type="submit" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</button>
    </form>
  );
}
