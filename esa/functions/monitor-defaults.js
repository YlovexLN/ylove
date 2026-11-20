// 由 scripts/esa-build.mjs 依据 config.toml 的 [monitor] / [[monitor.targets]] 生成，请勿手改。
//
// 边缘函数是独立打包的，读不到 config.toml（那份文件由 Vite 在构建期内联），
// 所以构建时把「配置文件里的默认值」写进这个文件，作为平台环境变量缺失时的兜底。
// 优先级：平台环境变量 > 本文件（来自 config.toml）。
export const DEFAULT_TARGETS = [];

export const DEFAULT_MONITOR = {
  "title": "服务可用率",
  "interval": 240,
  "timeout": 5000,
  "showHosts": false
};
