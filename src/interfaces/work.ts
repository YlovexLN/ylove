// 对应 Strapi 中的 Work 内容类型
export interface Work {
  id: number;
  documentId: string;
  title: string;
  description: string;
  url?: string;
  tags: string[];
  /** markdown 正文（纯静态模式），Strapi 模式无此字段 */
  body?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
