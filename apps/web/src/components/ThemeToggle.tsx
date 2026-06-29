"use client";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const ORDER: Mode[] = ["light", "dark", "system"];
const LABEL: Record<Mode, string> = { light: "LIGHT", dark: "DARK", system: "AUTO" };

function apply(mode: Mode) {
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Mode) || "light";
    setMode(saved);
    apply(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (((localStorage.getItem("theme") as Mode) || "light") === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    localStorage.setItem("theme", next);
    apply(next);
  };

  return (
    <button className="theme-toggle" onClick={cycle} aria-label={`테마 전환 (현재: ${LABEL[mode]})`}>
      {LABEL[mode]}
    </button>
  );
}
