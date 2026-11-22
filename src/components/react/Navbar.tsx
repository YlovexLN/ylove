import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";

// GitHub 仓库地址（固定链接，指向仓库页）
const GITHUB_URL = "https://github.com/YlovexLN/ylove";

interface NavbarProps {
  /** 站点 Logo 文案：由页面传入，避免客户端打包整份 config.toml?raw */
  logo?: string;
  /** 是否显示「服务状态」入口（监控关闭时为 false） */
  showStatus?: boolean;
}

export default function Navbar({ logo = "", showStatus = true }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Minimal 顶部导航（滚动后只叠一层向下渐隐的暗色遮罩，无毛玻璃、无硬边框）──
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        scrolled
          ? "bg-[linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0.42)_65%,transparent)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a
          href="/"
          className="text-2xl font-display text-text-primary hover:text-gold transition-colors"
        >
          {logo}
        </a>
        <div className="flex items-center gap-4">
          {showStatus && (
            <a
              href="/status"
              className="text-sm text-text-secondary transition-colors hover:text-gold"
            >
              服务状态
            </a>
          )}
          {GITHUB_URL && (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-text-secondary hover:text-gold transition-colors"
            >
              <Icon icon={faGithub} className="h-5! w-5!" />
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
