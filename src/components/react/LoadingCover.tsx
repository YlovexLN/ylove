import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { profile } from "@/data/profile";

function isEndfieldTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "EndField";
}

export default function LoadingCover() {
  const [hidden, setHidden] = useState(true);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "complete" | "sweep" | "fadeout">("loading");
  // runId 每次切进 EndField 时自增，用于重新触发加载动画
  const [runId, setRunId] = useState(0);
  const sweepRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // 主题检测 + 监听 — 每次切回 EndField 时重新播放加载动画
  useLayoutEffect(() => {
    const start = () => {
      doneRef.current = false;
      setProgress(0);
      setPhase("loading");
      setHidden(false);
      // 重置扫屏层，避免残留上一次的铺满状态
      const el = sweepRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = "scaleX(0)";
      }
      setRunId((r) => r + 1);
    };

    if (isEndfieldTheme()) start();

    const observer = new MutationObserver(() => {
      if (isEndfieldTheme()) {
        start();
      } else {
        setHidden(true);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // 进度动画 — 仅在 EndField 主题下运行，runId 变化时重新播放
  useEffect(() => {
    if (runId === 0 || hidden) return;

    const targetRef = { current: 0 };
    const displayRef = { current: 0 };
    let rafId: number;

    const animate = () => {
      const diff = targetRef.current - displayRef.current;
      if (diff > 0) {
        const step = Math.max(1, diff * 0.15);
        displayRef.current = Math.min(targetRef.current, displayRef.current + step);
        setProgress(Math.floor(displayRef.current));
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < 20) targetRef.current = Math.min(85, targetRef.current + 4 + Math.random() * 3);
      else if (!doneRef.current) targetRef.current = Math.min(100, targetRef.current + 2);
    }, 80);

    const maxWait = setTimeout(() => {
      targetRef.current = 100;
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(maxWait);
      cancelAnimationFrame(rafId);
    };
  }, [runId, hidden]);

  // 进度达到 100 → 扫屏 → 消失
  useEffect(() => {
    if (progress >= 100 && !doneRef.current) {
      doneRef.current = true;
      setPhase("complete");

      setTimeout(() => {
        setPhase("sweep");

        // 直接操作 DOM 触发扫屏动画（强制回流确保 transition 生效）
        const el = sweepRef.current;
        if (el) {
          el.style.transition = "none";
          el.style.transform = "scaleX(0)";
          el.offsetHeight; // 强制回流
          el.style.transition = "transform 0.45s ease-in-out";
          el.style.transform = "scaleX(1)";
        }
      }, 200);

      setTimeout(() => {
        setPhase("fadeout");
        setTimeout(() => setHidden(true), 400);
      }, 800);
    }
  }, [progress]);

  return (
    <div
      className="fixed inset-0 z-99999 overflow-hidden bg-bg-secondary loading-cover-root"
      style={{
        opacity: phase === "fadeout" ? 0 : 1,
        transition: "opacity 0.4s ease",
        display: hidden ? "none" : "block",
      }}
    >
      {/* 扫屏层 — 从左到右铺满屏幕 */}
      <div
        ref={sweepRef}
        className="absolute inset-0 bg-[#fffa00] pointer-events-none z-50"
        style={{ transformOrigin: "left", transform: "scaleX(0)" }}
      />

      {/* 左侧竖直进度条 */}
      <div className="absolute left-0 top-0 w-2.5 h-full z-10 bg-white/5">
        <div
          className="absolute top-0 left-0 w-full bg-[#fffa00]"
          style={{
            height: `${progress}%`,
            transition: "height 0.08s linear",
          }}
        />
      </div>

      {/* 进度信息 — 跟随进度条顶部 */}
      <div
        className="absolute left-6 z-10 flex flex-col gap-1.5"
        style={{
          top: `${Math.max(progress, 2)}%`,
          transition: "top 0.08s linear",
        }}
      >
        <div
          className="text-[40px] font-bold text-[#fffa00] tracking-[2px] leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {progress}%
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fffa00] loading-blink" />
          <span
            className="text-[11px] font-medium text-[#fffa00]/80 tracking-[2px] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {phase === "loading" ? "INITIALIZING" : "READY"}
          </span>
        </div>
      </div>

      {/* 右侧站点名称 */}
      <div className="absolute top-1/2 right-[12%] -translate-y-1/2 flex flex-col items-end gap-5 z-10">
        <div
          className="text-[23px] font-black text-white tracking-[6px] uppercase select-none text-right w-full"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {profile.logo}
        </div>
        <div
          className="text-[clamp(0.65rem,1vw,0.8rem)] font-bold text-white/40 tracking-[6px] uppercase text-right w-full"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ENDFIELD
        </div>
      </div>

      <style>{`
        @keyframes loading-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .loading-blink {
          animation: loading-blink 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
