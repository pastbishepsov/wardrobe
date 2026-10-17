import SwRegister from "@/components/SwRegister";
import TabBar from "@/components/TabBar";
import { missingEnv } from "@/lib/config";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const missing = missingEnv();
  return (
    <>
      <SwRegister />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-3 pb-24">
        {missing.length ? (
          <div className="card p-6">
            <h1 className="text-3xl">Почти готово</h1>
            <p className="mt-2 text-sm text-ink-soft">Приложению не хватает настроек. Добавь переменные окружения и перезапусти:</p>
            <ul className="mt-3 space-y-1 font-mono text-sm">
              {missing.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">Схема базы лежит в supabase/schema.sql — выполни её один раз в SQL Editor проекта Supabase. Подробности в README.</p>
          </div>
        ) : (
          children
        )}
      </div>
      <TabBar />
    </>
  );
}
