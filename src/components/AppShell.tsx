import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Flame, Moon, Sun, Volume2, VolumeX, Languages, Plus, Hammer } from "lucide-react";
import { computeStreak, todayKey, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { theme, lang, sound, set, activity, dailyGoal } = useStore();
  const t = useT();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [theme, lang]);

  if (!mounted)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Hammer className="size-8 text-primary animate-forge" />
      </div>
    );

  const streak = computeStreak(activity);
  const done = activity[todayKey()] ?? 0;
  const pct = Math.min(100, (done / dailyGoal) * 100);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid size-8 place-items-center rounded-xl bg-ember text-primary-foreground">
              <Hammer className="size-4" />
            </span>
            QuizForge
          </Link>
          <div className="ms-auto flex items-center gap-1">
            <div
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-semibold"
              title={`${streak} ${t.streak}`}
            >
              <Flame className="size-4 text-accent" /> {streak}
            </div>
            <button
              className="relative grid size-9 place-items-center rounded-full text-xs font-bold"
              title={`${t.goal}: ${done}/${dailyGoal}`}
              onClick={() => {
                const v = prompt(t.goal, String(dailyGoal));
                if (v && +v > 0) set({ dailyGoal: Math.round(+v) });
              }}
              style={{
                background: `conic-gradient(var(--accent) ${pct}%, var(--secondary) 0)`,
              }}
            >
              <span className="grid size-7 place-items-center rounded-full bg-background">
                {Math.min(done, 99)}
              </span>
            </button>
            <IconBtn onClick={() => set({ sound: !sound })} label={t.sound}>
              {sound ? <Volume2 /> : <VolumeX />}
            </IconBtn>
            <IconBtn onClick={() => set({ lang: lang === "en" ? "ar" : "en" })} label="EN/AR">
              <Languages />
            </IconBtn>
            <IconBtn onClick={() => set({ theme: theme === "dark" ? "light" : "dark" })} label="Theme">
              {theme === "dark" ? <Sun /> : <Moon />}
            </IconBtn>
            <Link
              to="/upload"
              className="ms-1 hidden items-center gap-1 rounded-xl bg-ember px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow sm:flex"
            >
              <Plus className="size-4" /> {t.upload}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</main>
      <Toaster position="top-center" />
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
