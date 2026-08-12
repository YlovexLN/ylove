import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { filterValidWorks, type WorkRecord } from "@/lib/work-parser";

interface WorkCardsProps {
  /** 初始记录（SSR 首屏渲染用） */
  initialWorks: WorkRecord[];
  /** markdown 模式下开启对 work.md 的实时监听（轮询 /api/works 流式追加） */
  watchLive?: boolean;
}

/** 内容监听轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 5000;

export default function WorkCards({
  initialWorks,
  watchLive = false,
}: WorkCardsProps) {
  // 初始记录先经过校验过滤，确保不渲染格式不完整的卡片
  const [works, setWorks] = useState<WorkRecord[]>(() =>
    filterValidWorks(initialWorks)
  );
  // 已渲染记录的 id 集合，用于识别新增内容（流式追加，不打乱原有排序）
  const seenIds = useRef<Set<string>>(new Set(works.map((w) => w.id)));

  // 内容监听机制：轮询 /api/works，捕获 work.md 中新增记录后按添加顺序追加渲染
  useEffect(() => {
    if (!watchLive) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/works");
        if (!res.ok) return;
        const fresh = filterValidWorks((await res.json()) as WorkRecord[]);
        const newRecords = fresh.filter((w) => !seenIds.current.has(w.id));
        if (newRecords.length === 0) return;
        newRecords.forEach((w) => seenIds.current.add(w.id));
        setWorks((prev) => [...prev, ...newRecords]);
      } catch {
        // 请求或解析异常静默处理，等待下一轮轮询
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [watchLive]);

  return (
    <div className="grid grid-cols-2 gap-6 text-left">
      {works.map((work) => (
        <Card
          key={work.id}
          className="flex flex-col overflow-hidden p-0 hover:-translate-y-0.5"
        >
          {work.image && (
            <div className="aspect-video w-full overflow-hidden bg-bg-primary">
              <img
                src={work.image}
                alt={work.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col p-6">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">{work.title}</CardTitle>
              <CardDescription className="text-base line-clamp-3">
                {work.description}
              </CardDescription>
            </CardHeader>

            {work.body && (
              <CardContent className="flex-1 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                {work.body}
              </CardContent>
            )}

            <CardFooter className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-wrap gap-2">
                {work.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="px-3 py-1 text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
              {work.url && (
                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonVariants({ variant: "outline" })} gap-2 text-base`}
                >
                  点击前往
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-4 w-4" />
                </a>
              )}
            </CardFooter>
          </div>
        </Card>
      ))}
    </div>
  );
}
