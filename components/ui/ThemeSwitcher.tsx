"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";
import { guestThemeKey } from "./ThemeProvider";

export default function ThemeSwitcher() {
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function toggleTheme() {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    setError("");

    if (!user) {
      localStorage.setItem(guestThemeKey, nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.dataset.theme = nextTheme;
      return;
    }

    setSaving(true);
    try {
      await platformRequest("/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ themePreference: nextTheme }),
      });
      await refreshUser();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your theme preference.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggleTheme()}
        disabled={saving}
        aria-label="Toggle light and dark theme"
        title="Toggle theme"
        className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Sun className="size-5 dark:hidden" />
        <Moon className="hidden size-5 dark:block" />
      </button>
      {error && <span role="alert" className="absolute right-0 top-full z-50 mt-1 w-56 rounded bg-red-50 p-2 text-xs text-red-700 shadow">{error}</span>}
    </div>
  );
}
