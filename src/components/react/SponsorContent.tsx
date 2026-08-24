import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faQrcode,
  faArrowLeft,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { faWeixin, faAlipay } from "@fortawesome/free-brands-svg-icons";
import QRCode from "qrcode";

type PayMethod = "wechat" | "alipay";

interface SponsorData {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle: string;
  /** 微信收款链接（填了则页面自动生成纯二维码） */
  wechatLink: string;
  /** 支付宝收款链接（填了则页面自动生成纯二维码） */
  alipayLink: string;
  /** 微信收款码图片路径（优先于链接） */
  wechatQr: string;
  /** 支付宝收款码图片路径（优先于链接） */
  alipayQr: string;
  /** 爱发电跳转链接（空则不显示） */
  afdianUrl: string;
}

interface SponsorContentProps {
  sponsor: SponsorData;
}

const methodMeta: Record<
  PayMethod,
  { label: string; icon: IconDefinition; hint: string }
> = {
  wechat: { label: "微信", icon: faWeixin, hint: "微信扫一扫，请我喝奶茶~" },
  alipay: { label: "支付宝", icon: faAlipay, hint: "支付宝扫一扫，请我喝奶茶~" },
};

// 根据收款链接在浏览器端生成纯二维码（黑码白底，无头像无 logo）
function QrCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 默认黑白配色：黑色图案 + 白底，扫码最稳
    QRCode.toCanvas(
      canvas,
      value,
      {
        width: 208,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      (err?: unknown) => {
        if (cancelled) return;
        if (err) setStatus("error");
        else setStatus("ready");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-white">
      <canvas ref={canvasRef} className="h-full w-full" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-card">
          {status === "error" ? (
            <>
              <FontAwesomeIcon icon={faQrcode} className="mb-2 h-8 w-8 text-text-muted" />
              <p className="text-xs text-text-muted">二维码加载失败</p>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faQrcode} className="mb-2 h-8 w-8 animate-pulse text-text-muted" />
              <p className="text-xs text-text-muted">二维码加载中…</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SponsorContent({ sponsor }: SponsorContentProps) {
  const [method, setMethod] = useState<PayMethod>("wechat");
  const meta = methodMeta[method];
  const image = method === "wechat" ? sponsor.wechatQr : sponsor.alipayQr;
  const link = method === "wechat" ? sponsor.wechatLink : sponsor.alipayLink;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-24">
      <h1 className="mb-3 text-center font-display font-hero-weight text-3xl md:text-4xl">
        {sponsor.title}
      </h1>
      <p className="mb-10 whitespace-pre-line text-center text-text-secondary">
        {sponsor.subtitle}
      </p>

      {/* 微信 / 支付宝 选择框 */}
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-card p-6 text-center">
        <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-full border border-border-default bg-bg-primary/60 p-1.5">
          {(Object.keys(methodMeta) as PayMethod[]).map((m) => {
            const active = method === m;
            return (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2.5 rounded-full px-5 py-3 text-base font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                  active
                    ? "bg-gold text-black shadow-lg shadow-gold/25"
                    : "text-text-secondary hover:bg-bg-card-hover hover:text-gold"
                }`}
              >
                <FontAwesomeIcon icon={methodMeta[m].icon} className="h-5 w-5" />
                {methodMeta[m].label}
              </button>
            );
          })}
        </div>

        {image ? (
          <img
            src={image}
            alt={meta.label}
            className="mx-auto h-52 w-52 rounded-lg border border-border-default object-contain"
          />
        ) : link ? (
          <QrCanvas value={link} />
        ) : (
          <div className="mx-auto flex h-52 w-52 flex-col items-center justify-center rounded-lg border border-dashed border-border-default">
            <FontAwesomeIcon icon={faQrcode} className="mb-3 h-11 w-11 text-text-muted" />
            <p className="text-base text-text-muted">二维码制作中</p>
          </div>
        )}
        <p className="mt-4 text-base text-text-muted">{meta.hint}</p>
      </div>

      {/* 爱发电跳转 */}
      {sponsor.afdianUrl && (
        <a
          href={sponsor.afdianUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-card px-6 py-3 text-sm text-text-secondary transition-colors duration-200 hover:border-gold/40 hover:bg-bg-card-hover hover:text-gold"
        >
          {/* 爱发电 logo（CSS mask 渲染，颜色跟随 currentColor → 官方紫） */}
          <span
            className="block h-5 w-5 shrink-0 text-[#7e5fd9]"
            style={{
              backgroundColor: "currentColor",
              maskImage: "url(/icon/afdian.svg)",
              WebkitMaskImage: "url(/icon/afdian.svg)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
          前往爱发电赞助（还在认证创作者中）
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
        </a>
      )}

      {/* 返回首页 */}
      <a
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm text-text-muted transition-colors duration-200 hover:text-gold"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        返回首页
      </a>
    </main>
  );
}
