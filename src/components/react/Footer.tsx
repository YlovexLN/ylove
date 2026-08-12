import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

interface FooterInfoItem {
  /** 链接前的文字（如 "CDN - "） */
  label?: string;
  text: string;
  url: string;
}

interface FooterIcp {
  /** 是否显示备案号（false 单独隐藏） */
  show?: boolean;
  label?: string;
  text?: string;
  url?: string;
}

interface FooterProps {
  /** 页脚底部信息配置（CDN / Host 等普通项 + 独立备案号），show=false 或全部为空时不显示 */
  footerInfo?: {
    show?: boolean;
    items?: FooterInfoItem[];
    icp?: FooterIcp;
  };
}

export default function Footer({ footerInfo }: FooterProps) {
  const items = footerInfo?.items ?? [];
  const icp = footerInfo?.icp;
  const showIcp = !!icp && icp.show !== false && !!icp.url;
  const showFooterInfo =
    footerInfo?.show !== false && (items.length > 0 || showIcp);

  return (
    <footer className="border-t border-border-default py-6 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-text-muted sm:text-sm">
        <span>&copy; {new Date().getFullYear()} YlovexLN. All rights reserved.</span>
        <span className="hidden sm:inline text-border-default">·</span>
        <span className="inline-flex items-center gap-1">
          Built with
          <FontAwesomeIcon icon={faHeart} className="h-3 w-3 text-gold" />
          Astro &amp; React
        </span>
        {showFooterInfo && (
          <>
            <span className="hidden sm:inline text-border-default">·</span>
            <span>
              {items.map((item, i) => (
                <span key={item.url}>
                  {i > 0 && " | "}
                  {item.label}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold transition-colors duration-200"
                  >
                    {item.text}
                  </a>
                </span>
              ))}
              {showIcp && items.length > 0 && " | "}
              {showIcp && (
                <>
                  {icp.label}
                  <a
                    href={icp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gold transition-colors duration-200"
                  >
                    {icp.text}
                  </a>
                </>
              )}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
