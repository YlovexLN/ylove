import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { profile } from "@/data/profile";

// GitHub 仓库地址（固定链接，指向仓库页）
const GITHUB_URL = "https://github.com/YlovexLN/ylove";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
        </div>
      </nav>
    </header>
  );
}
