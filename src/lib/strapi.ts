// Strapi API 包装器 — 支持 Strapi Cloud 与自部署（通过 STRAPI_URL 环境变量区分）

interface FetchProps {
  endpoint: string;
  query?: Record<string, string>;
  wrappedByKey?: string;
  wrappedByList?: boolean;
}

/**
 * 从 Strapi API 获取数据
 * @param endpoint - 请求的端点（如 "works"）
 * @param query - 附加到 URL 的查询参数
 * @param wrappedByKey - 从响应中解包指定的键（Strapi v5 用 "data"）
 * @param wrappedByList - 列表响应只取第一项
 */
export default async function fetchApi<T>({
  endpoint,
  query,
  wrappedByKey,
  wrappedByList,
}: FetchProps): Promise<T> {
  if (endpoint.startsWith("/")) {
    endpoint = endpoint.slice(1);
  }

  const url = new URL(`${import.meta.env.STRAPI_URL}/api/${endpoint}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = import.meta.env.STRAPI_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    console.error(`[strapi] ${endpoint} 请求失败: ${res.status}`);
    throw new Error(`Strapi API error: ${res.status}`);
  }

  let data: unknown = await res.json();

  if (wrappedByKey) {
    data = (data as Record<string, unknown>)[wrappedByKey];
  }
  if (wrappedByList) {
    data = Array.isArray(data) ? data[0] : data;
  }

  return data as T;
}
