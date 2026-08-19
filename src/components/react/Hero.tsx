import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGithub,
  faTwitter,
  faLinkedin,
  faBilibili,
  faYoutube,
  faInstagram,
  faDiscord,
  faTelegram,
  faWeixin,
  faQq,
  faNpm,
  faStackOverflow,
  faReddit,
  faFacebook,
  faXTwitter,
  faTwitch,
  faTiktok,
  faMedium,
  faSpotify,
  faCodepen,
  faGitlab,
  faBitbucket,
  faDocker,
  faFigma,
  faSlack,
  faLine,
  faZhihu,
  faSteam,
  faKoFi,
  faPatreon,
} from "@fortawesome/free-brands-svg-icons";
import {
  faEnvelope,
  faRss,
  faGlobe,
  faPhone,
  faHeadphones,
  faPodcast,
  faRadio,
  faChevronDown,
  faMugHot,
} from "@fortawesome/free-solid-svg-icons";
import { useLivePulse } from "@/hooks/useLivePulse";
import { getRingStyle } from "@/utils/live-ring";
import { profile } from "@/data/profile";

interface Social {
  name: string;
  url: string;
  icon: string;
  /** 自定义图标图片地址，提供时优先于 icon 渲染 */
  logo?: string;
}

// 社交图标注册表 — 配置里填的 icon 名（小写）对应到这里的 Font Awesome 图标
const socialIconMap: Record<string, IconDefinition> = {
  github: faGithub,
  twitter: faTwitter,
  x: faXTwitter,
  linkedin: faLinkedin,
  bilibili: faBilibili,
  youtube: faYoutube,
  instagram: faInstagram,
  discord: faDiscord,
  telegram: faTelegram,
  weixin: faWeixin,
  qq: faQq,
  npm: faNpm,
  stackoverflow: faStackOverflow,
  reddit: faReddit,
  facebook: faFacebook,
  twitch: faTwitch,
  tiktok: faTiktok,
  medium: faMedium,
  spotify: faSpotify,
  codepen: faCodepen,
  gitlab: faGitlab,
  bitbucket: faBitbucket,
  docker: faDocker,
  figma: faFigma,
  slack: faSlack,
  line: faLine,
  zhihu: faZhihu,
  steam: faSteam,
  // 赞助 / 打赏平台
  kofi: faKoFi,
  "ko-fi": faKoFi,
  patreon: faPatreon,
  // 咖啡 / 奶茶
  coffee: faMugHot,
  mug: faMugHot,
  "mug-hot": faMugHot,
  "milk-tea": faMugHot,
  // 实心图标
  mail: faEnvelope,
  email: faEnvelope,
  rss: faRss,
  phone: faPhone,
  globe: faGlobe,
  website: faGlobe,
  // 音频平台
  headphones: faHeadphones,
  podcast: faPodcast,
  radio: faRadio,
};

interface HeroProps {
  name: string;
  avatar: string;
  titles: string[];
  typewriterSpeed: number;
  socials: Social[];
  /** 是否显示社交图标（false 时只显示文字） */
  showSocialIcons?: boolean;
  bilibiliUid?: number;
  liveGifUrl?: string;
  mode?: string;
}

export default function Hero({
  name,
  avatar,
  titles: heroTitles,
  typewriterSpeed,
  socials,
  showSocialIcons = true,
  bilibiliUid,
  liveGifUrl,
  mode,
}: HeroProps) {
  const [titleIndex, setTitleIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveRoom, setLiveRoom] = useState("");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const pulseProgress = useLivePulse(isLive);
  const [avatarSrc] = useState(avatar || (bilibiliUid ? `/api/bili-api?action=avatar&uid=${bilibiliUid}` : ""));
  const typeRef = useRef({ i: 0, deleting: false });

  // 打字机效果
  useEffect(() => {
    const fullText = heroTitles[titleIndex];
    const speed = isDeleting ? Math.round(typewriterSpeed / 2) : typewriterSpeed;

    const timer = setTimeout(() => {
      const ref = typeRef.current;
      if (!ref.deleting) {
        if (ref.i < fullText.length) {
          ref.i++;
          setDisplayText(fullText.slice(0, ref.i));
        } else {
          // 打完后等待再删除
          setTimeout(() => {
            ref.deleting = true;
            setIsDeleting(true);
          }, 3000);
          return;
        }
      } else {
        if (ref.i > 0) {
          ref.i--;
          setDisplayText(fullText.slice(0, ref.i));
        } else {
          // 删完后切到下一条
          ref.deleting = false;
          setIsDeleting(false);
          setTitleIndex((prev) => (prev + 1) % heroTitles.length);
          return;
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [titleIndex, displayText, isDeleting, heroTitles]);

  // 客户端定时检测直播状态
  useEffect(() => {
    if (!bilibiliUid) return;

    const checkLive = async () => {
      try {
        const params = new URLSearchParams({ uid: String(bilibiliUid) });
        const res = await fetch(`/api/bili-api?${params}`);
        const json = await res.json();
        setIsLive(json.live);
        if (json.roomId) setLiveRoom(json.roomId);
      } catch {
        // 静默失败
      }
    };

    checkLive();
    const interval = setInterval(checkLive, 300000);
    return () => clearInterval(interval);
  }, [bilibiliUid]);

  useEffect(() => {
    setVisible(true);
  }, []);

  // 滚动到下一段内容时隐藏滚动提示
  useEffect(() => {
    if (mode !== "scroll") return;

    const handleScroll = () => {
      setShowScrollHint(window.scrollY < window.innerHeight * 0.2);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mode]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      

      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* EndField 斜线纹理背景 — 从右向左平行移动，仅显示底部一半 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none endfield-scroll-bg">
        <div className="endfield-scroll-row">
          {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text} &nbsp; {profile.background_text}
        </div>
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Avatar */}
        <div
          className={`mb-8 transition-all duration-1000 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative inline-block">
            {/* B站风格 Live Ani */}
            <div className={isLive ? "live-ani" : ""}>
              {/* Avatar */}
              <div className="relative w-36 h-36 mx-auto">
                {isLive && (
                  <>
                    <div style={getRingStyle(pulseProgress, 0)} />
                    <div style={getRingStyle(pulseProgress, 0.33)} />
                    <div style={getRingStyle(pulseProgress, 0.67)} />
                  </>
                )}
                {avatarSrc && (
                <div
                  className={`w-full h-full rounded-full overflow-hidden ring-2 ${
                    isLive ? "ring-[rgba(255,102,153,0.9)]" : "ring-gold/30"
                  }`}
                >
                  <img
                    src={avatarSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                </div>
                )}
                {/* Live badge - 直播中 */}
                {isLive && liveGifUrl && (
                  <a
                    href={`https://live.bilibili.com/${liveRoom || bilibiliUid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="living-tips"
                  >
                    <div className="b-img">
                      <img src={liveGifUrl} alt="" className="b-img__inner" />
                    </div>
                    <div className="living-text">直播中</div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Name */}
        <h1
          className={`text-5xl md:text-7xl font-display font-hero-weight mb-4 transition-all duration-1000 delay-200 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {name}
        </h1>

        {/* Animated Title */}
        <div
          className={`mb-6 h-8 transition-all duration-1000 delay-400 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-lg md:text-xl text-text-secondary" style={{ fontFamily: "var(--font-display)" }}>
            <span className="inline-block min-w-[2ch] text-left">
              {displayText}
            </span>
          </span>
        </div>

        {/* Social Links */}
        <div
          className={`flex items-center justify-center gap-3 flex-wrap transition-all duration-1000 delay-800 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {socials.map((social) => {
            const IconComp =
              socialIconMap[social.icon.toLowerCase()] || faGlobe;
            // 站内链接（以 / 开头）在当前标签页打开，外部链接新开标签页
            const isInternal = social.url.startsWith("/");
            return (
              <a
                key={social.name}
                href={social.url}
                target={isInternal ? undefined : "_blank"}
                rel={isInternal ? undefined : "noopener noreferrer"}
                className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-card px-3 py-2 text-sm text-text-secondary transition-all duration-200 hover:border-gold/30 hover:bg-bg-card-hover hover:text-gold"
                aria-label={social.name}
              >
                {showSocialIcons &&
                  (social.logo ? (
                    // 用 CSS mask 渲染 SVG logo，颜色跟随文字（灰 → hover 金），与 Font Awesome 图标一致
                    <span
                      className="block h-5 w-5 transition-colors duration-200"
                      style={{
                        backgroundColor: "currentColor",
                        maskImage: `url(${social.logo})`,
                        WebkitMaskImage: `url(${social.logo})`,
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                      }}
                    />
                  ) : (
                    <FontAwesomeIcon icon={IconComp} className="h-5! w-5!" />
                  ))}
                <span>{social.name}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Scroll down indicator */}
      {mode === "scroll" && (
        <button
          onClick={() => {
            const next = document.querySelector(".scroll-section");
            next?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer transition-all duration-1000 ${
            visible && showScrollHint ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="animate-bounce">
            <FontAwesomeIcon
              icon={faChevronDown}
              className="h-4 w-4 text-text-muted/50"
            />
          </div>
          <span className="text-sm text-text-muted/50 font-display">查看更多</span>
        </button>
      )}
    </section>
  );
}
