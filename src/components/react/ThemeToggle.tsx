import { useState, useEffect } from "react";

type Theme = "MiniMal" | "EndField";

function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "MiniMal" || saved === "EndField") return saved;
  } catch {}
  return "MiniMal";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("theme", theme); } catch {}
}

interface Props {
  compact?: boolean;
}

export default function ThemeToggle({ compact }: Props) {
  const [theme, setTheme] = useState<Theme>("MiniMal");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const toggle = () => {
    const next = theme === "MiniMal" ? "EndField" : "MiniMal";
    setTheme(next);
    applyTheme(next);
  };

  // 悬停颜色跟随当前主题：MiniMal → 金色主题色；EndField → 白色
  const hoverColor = theme === "MiniMal" ? "hover:text-gold hover:border-gold" : "hover:text-white hover:border-white";

  return (
    <button
      onClick={toggle}
      className={`btn-texture flex items-center rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
        compact
          ? `gap-0 py-1.5 border-transparent bg-black text-btn-default ${hoverColor} w-full justify-center`
          : `gap-2 px-2.5 py-1.5 border border-border-default text-xs text-btn-default ${hoverColor} bg-black`
      }`}
      aria-label={`Switch to ${theme === "MiniMal" ? "EndField" : "MiniMal"} theme`}
    >
      {/* 调色盘图标 */}
      <svg className={`${compact ? "w-4 h-4" : "w-3.5 h-3.5 shrink-0"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5" />
        <circle cx="17" cy="10.5" r="1.5" />
        <circle cx="8.5" cy="7.5" r="1.5" />
        <circle cx="6" cy="12" r="1.5" />
        <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5 .3.5.8.8 1.3.8h2.8c.7 0 1.3.6 1.3 1.3 0 .3.1.7.4.9.7.7 1.7 1 2.9 1 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
      </svg>
      {!compact && <span style={{ letterSpacing: "1px" }}>{theme === "MiniMal" ? "EndField" : "MiniMal"}</span>}
    </button>
  );
}
