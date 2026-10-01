"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
function subscribe(callback: () => void) {
  function changed() {
    try {
      const saved = localStorage.getItem("klang-theme");
      document.documentElement.dataset.theme =
        saved === "dark" || saved === "light"
          ? saved
          : matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    } catch {
      /* Keep the current theme when storage is unavailable. */
    }
    callback();
  }
  window.addEventListener("storage", changed);
  window.addEventListener("klang-theme-change", callback);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener("klang-theme-change", callback);
  };
}
function snapshot() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  function choose(value: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", value);
    try {
      localStorage.setItem("klang-theme", value);
    } catch {
      /* Theme still changes for this session. */
    }
    window.dispatchEvent(new Event("klang-theme-change"));
  }
  return (
    <div
      id="app_theme_switcher"
      role="group"
      aria-label="ธีมแอป"
      className="border-input bg-background fixed right-4 bottom-4 z-40 flex gap-1 rounded-full border p-1 shadow-lg"
    >
      {(["light", "dark"] as const).map((value) => {
        const Icon = value === "light" ? Sun : Moon;
        return (
          <Button
            key={value}
            id={`theme_${value}_button`}
            type="button"
            size="sm"
            variant={theme === value ? "default" : "outline"}
            aria-label={value === "light" ? "Light" : "Dark"}
            title={value === "light" ? "Light" : "Dark"}
            aria-pressed={theme === value}
            onClick={() => choose(value)}
            className="size-8 rounded-full border-0 p-0"
          >
            <Icon aria-hidden="true" className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
