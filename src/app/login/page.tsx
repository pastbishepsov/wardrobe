"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Не тот пароль");
      return;
    }
    // Only follow same-site paths, never an absolute or protocol-relative URL.
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/wardrobe");
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-6 fade-up">
      <h1 className="text-3xl mb-1">Гардероб</h1>
      <p className="text-sm text-ink-soft mb-5">Введи пароль — один раз, дальше вход запомнится.</p>
      <input
        className="field mb-3"
        type="password"
        inputMode="text"
        autoComplete="current-password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
      />
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !password}>
        {busy ? "Проверяю…" : "Войти"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
