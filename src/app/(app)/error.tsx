"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card p-6 text-center">
      <p className="display text-2xl">Что-то пошло не так</p>
      <p className="mt-2 text-sm text-ink-soft">
        {process.env.NODE_ENV === "development" ? error.message : "Чаще всего это база (Supabase) или ключи в настройках. Попробуй ещё раз, если не поможет — проверь переменные окружения."}
      </p>
      <button className="btn btn-primary mt-4" onClick={reset}>
        Попробовать снова
      </button>
    </div>
  );
}
