"use client";
import { useState, useSyncExternalStore } from "react";
import { Check, LayoutTemplate, Moon, Sun } from "lucide-react";
import {
  brandTemplates,
  readTemplate,
  type BrandTemplate,
} from "@/lib/appearance";
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
    try {
      document.documentElement.dataset.template = readTemplate(
        localStorage.getItem("klang-template"),
      );
    } catch {}
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
function templateSnapshot() {
  return readTemplate(document.documentElement.dataset.template);
}
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const template = useSyncExternalStore(
    subscribe,
    templateSnapshot,
    () => "teal-command",
  );
  function chooseTemplate(value: BrandTemplate) {
    document.documentElement.setAttribute("data-template", value);
    try {
      localStorage.setItem("klang-template", value);
    } catch {}
    window.dispatchEvent(new Event("klang-theme-change"));
    setOpen(false);
    document.getElementById("app_template_button")?.focus();
  }
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
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          document.getElementById("app_template_button")?.focus();
        }
      }}
      className="border-input bg-background fixed right-4 bottom-4 z-40 flex gap-1 rounded-full border p-1 shadow-lg"
    >
      {open && (
        <>
          <button
            id="app_template_dismiss"
            tabIndex={-1}
            aria-label="ปิดตัวเลือก Template"
            className="fixed inset-0 -z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            id="app_template_panel"
            aria-label="เลือก Template"
            className="brand-panel border-input absolute right-0 bottom-full mb-3 w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-xl"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                document.getElementById("app_template_button")?.focus();
              }
            }}
          >
            <h2
              id="app_template_title"
              className="px-2 py-2 text-sm font-semibold"
            >
              Template
            </h2>
            <div id="app_template_options" className="space-y-1">
              {brandTemplates.map((item) => (
                <button
                  id={`template_${item.key}_button`}
                  key={item.key}
                  type="button"
                  autoFocus={template === item.key}
                  aria-pressed={template === item.key}
                  onClick={() => chooseTemplate(item.key)}
                  className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg p-3 text-left outline-none focus-visible:ring-2"
                >
                  <span aria-hidden="true" className="flex shrink-0 -space-x-1">
                    {item.colors.map((color) => (
                      <span
                        key={color}
                        className="border-background size-4 rounded-full border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {item.description}
                    </span>
                  </span>
                  {template === item.key && (
                    <Check
                      className="text-primary size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      <Button
        id="app_template_button"
        type="button"
        size="sm"
        variant="outline"
        aria-label="เลือก Template"
        title="เลือก Template"
        aria-expanded={open}
        aria-controls="app_template_panel"
        onClick={() => setOpen(!open)}
        className="size-8 rounded-full border-0 p-0"
      >
        <LayoutTemplate className="size-4" aria-hidden="true" />
      </Button>
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
