import { parse } from "smol-toml";
import raw from "../../config.toml?raw";

interface RawSponsor {
  /** 页面标题（不填则用默认） */
  title?: string;
  /** 页面副标题（不填则用默认） */
  subtitle?: string;
  /** 微信 / 支付宝收款链接（填了则页面自动生成纯二维码） */
  wechat_link?: string;
  alipay_link?: string;
  /** 微信 / 支付宝收款码图片路径（优先于链接） */
  wechat_qr?: string;
  alipay_qr?: string;
  /** 爱发电跳转链接（留空则不显示） */
  afdian_url?: string;
}

interface RawConfig {
  sponsor?: RawSponsor;
}

const config = parse(raw) as unknown as RawConfig;

export function getSponsor() {
  const s = config.sponsor || {};
  return {
    title: s.title || "请我喝杯奶茶",
    subtitle:
      s.subtitle ||
      "如果我的内容对你有帮助，欢迎赞助支持～你的支持是我持续创作的动力！",
    wechatLink: s.wechat_link || "",
    alipayLink: s.alipay_link || "",
    wechatQr: s.wechat_qr || "",
    alipayQr: s.alipay_qr || "",
    afdianUrl: s.afdian_url || "",
  };
}

export const sponsor = getSponsor();
