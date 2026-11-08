"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";

const guestThemeKey = "mytube-theme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const savedGuestTheme = localStorage.getItem(guestThemeKey);
    const preference = user?.themePreference ?? savedGuestTheme ?? "auto";
    const effectiveTheme =
      preference === "auto"
        ? user?.lastLoginTheme ?? "dark"
        : preference;
    document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
    document.documentElement.dataset.theme = effectiveTheme;
  }, [user]);

  return children;
}

export { guestThemeKey };
