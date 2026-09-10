import type { faGithub } from "@fortawesome/free-brands-svg-icons";

/**
 * Font Awesome 图标数据结构（free-* 图标包导出的图标对象）。
 * 直接由 typeof 推导，避免依赖 @fortawesome/fontawesome-svg-core。
 */
export type FaIcon = typeof faGithub;

interface IconProps {
  icon: FaIcon;
  className?: string;
  /** 无障碍名称：提供时图标对读屏可见，省略则视为纯装饰 */
  label?: string;
}

/**
 * 轻量图标组件：把 Font Awesome 的图标数据直接渲染为内联 <svg>。
 *
 * 用于替换 @fortawesome/react-fontawesome + fontawesome-svg-core —— 这两个包
 * 会给首屏额外带来约 91KB JS（实测线上 dist.zukp3wZw.js），而项目只用到
 * icon + className 两个属性，内联 SVG 即可完全覆盖。
 */
export function Icon({ icon, className, label }: IconProps) {
  // Font Awesome 图标数据：[宽度, 高度, 连字, unicode, SVG path 数据]
  const [width, height, , , pathData] = icon.icon;
  const paths = Array.isArray(pathData) ? pathData : [pathData];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      // inline-block / overflow-visible / 基线微调：等价于 Font Awesome 官方组件
      // 注入的 .svg-inline--fa 基础样式，保证替换后图标与文字的对齐不变
      className={`inline-block overflow-visible align-[-0.125em] ${className ?? ""}`}
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
