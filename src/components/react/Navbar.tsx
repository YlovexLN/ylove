import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import ThemeToggle from "@/components/react/ThemeToggle";
import { profile } from "@/data/profile";

function getCurrentTheme(): string {
  if (typeof document === "undefined") return "MiniMal";
  return document.documentElement.getAttribute("data-theme") || "MiniMal";
}

// GitHub 仓库地址（固定链接，指向仓库页）
const GITHUB_URL = "https://github.com/YlovexLN/ylove";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState("MiniMal");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setTheme(getCurrentTheme());

    const observer = new MutationObserver(() => {
      setTheme(getCurrentTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isEndfield = theme === "EndField";
  const expanded = hovered;
  // 是否在首页（非首页时导航锚点需带 / 前缀，跳回首页对应区块）
  const isHome =
    typeof window === "undefined" || window.location.pathname === "/";

  // 同步 CSS 变量
  const sidebarW = expanded ? 224 : 56;
  if (isEndfield && typeof document !== "undefined") {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${sidebarW}px`,
    );
  }

  // ── Endfield 鼠标悬浮展开侧边栏 ──
  if (isEndfield) {
    return (
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col endfield-sidebar"
        style={{
          width: sidebarW,
          background: "#fffa00",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          color: "#000000",
          overflow: "hidden",
          willChange: "width",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="flex flex-col justify-between h-full overflow-hidden"
          style={{
            width: "100%",
            paddingLeft: expanded ? 12 : 0,
            paddingRight: expanded ? 12 : 0,
            transition: "padding 0.3s",
          }}
        >
          {/* 顶部 — Logo 始终显示完整 */}
          <div className="pt-6 overflow-hidden">
            <a
              href="#"
              className="block overflow-hidden whitespace-nowrap"
              style={{
                color: "#000000",
                fontSize: expanded ? 18 : 9,
                letterSpacing: expanded ? "0.05em" : "-0.5px",
                fontWeight: "900",
                fontFamily: "var(--font-display)",
                transition: "font-size 0.3s, letter-spacing 0.3s, padding 0.3s",
                lineHeight: expanded ? 1.4 : 2,
                paddingLeft: expanded ? 0 : 4,
                paddingRight: expanded ? 0 : 4,
              }}
            >
              {profile.logo}
            </a>
            {/* 悬浮时才显示副标题 */}
            <div
              className="text-[10px] font-mono mt-1 tracking-[0.15em] uppercase whitespace-nowrap"
              style={{
                color: "rgba(0,0,0,0.5)",
                opacity: expanded ? 1 : 0,
                transition: "opacity 0.2s ease",
              }}
            >
              Administrato
            </div>
            <div
              className="w-full mt-5 mb-5"
              style={{
                height: 1,
                background: "rgba(0,0,0,0.1)",
                transition: "opacity 0.2s ease",
                opacity: expanded ? 1 : 0,
                paddingLeft: expanded ? 0 : 4,
              }}
            />
          </div>

          {/* 中间导航 */}
          <nav
            className="flex flex-col gap-3 text-xs font-mono tracking-widest uppercase whitespace-nowrap -mt-20 overflow-hidden"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            {[
              { label: "Profile", icon: "◈", slug: "profile", key: "profile" },
              { label: "Works", icon: "⚡", slug: "works", key: "works" },
              { label: "Repository", icon: "◫", slug: "repository", key: "repository" },
              { label: "Contact", icon: "✉", slug: "contact", key: "contact" },
            ]
              .filter((item) => profile.modules[item.key as keyof typeof profile.modules] !== false)
              .map((item) => (
              <a
                key={item.label}
                href={
                  profile.mode === "scroll"
                    ? `${isHome ? "" : "/"}#${item.slug}`
                    : "#"
                }
                className="flex items-center gap-2 py-1 whitespace-nowrap"
                style={{
                  color: "rgba(0,0,0,0.55)",
                  transition: "color 0.2s",
                  paddingLeft: expanded ? 0 : 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#000000")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(0,0,0,0.55)")
                }
              >
                <span className="text-xs" style={{ color: "rgba(0,0,0,0.4)" }}>
                  {item.icon}
                </span>
                <span
                  style={{
                    opacity: expanded ? 1 : 0,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {item.label}
                </span>
              </a>
            ))}
          </nav>

          {/* 底部 */}
          <div className="pb-6 overflow-hidden">
            <div
              className="w-full mb-5"
              style={{
                height: 1,
                background: "rgba(0,0,0,0.1)",
                transition: "opacity 0.2s ease",
                opacity: expanded ? 1 : 0,
              }}
            />
            <div style={{ overflow: expanded ? "visible" : "hidden" }}>
              <div
                className="flex items-center justify-center gap-3"
                style={{ padding: expanded ? "0" : "0 6px" }}
              >
                {GITHUB_URL && (
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="transition-colors"
                    style={{
                      color: "rgba(0,0,0,0.55)",
                      opacity: expanded ? 1 : 0.8,
                      transition: "color 0.2s, opacity 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#000000")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(0,0,0,0.55)")
                    }
                  >
                    <FontAwesomeIcon icon={faGithub} className="h-5! w-5!" />
                  </a>
                )}
                <ThemeToggle compact={!expanded} />
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // ── Minimal 顶部导航 ──
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "scrolled bg-black/80 backdrop-blur-xl border-b border-border-default"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a
          href="#"
          className="text-2xl font-display text-text-primary hover:text-gold transition-colors"
        >
          {profile.logo}
        </a>
        <div className="flex items-center gap-3">
          {GITHUB_URL && (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-text-secondary hover:text-gold transition-colors"
            >
              <FontAwesomeIcon icon={faGithub} className="h-5! w-5!" />
            </a>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
