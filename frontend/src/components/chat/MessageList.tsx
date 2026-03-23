import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "./types";
import { MessageBubble } from "./MessageBubble";
import { ArrowDown } from "lucide-react";

type RenderItem =
  | { kind: "day"; id: string; label: string }
  | { kind: "msg"; id: string; msg: ChatMessage; showAvatar: boolean; showAuthorName: boolean };

const getDayKey = (msg: ChatMessage) => {
  const date = msg.createdAt?.toDate?.();
  if (!date) return "unknown";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDayLabel = (dayKey: string) => {
  if (dayKey === "unknown") return "Recent";
  const [y, m, d] = dayKey.split("-").map((v) => Number(v));
  const date = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfThatDay) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: today.getFullYear() === date.getFullYear() ? undefined : "numeric" });
};

export function MessageList({
  messages,
  currentUserId,
  endRef,
}: {
  messages: ChatMessage[];
  currentUserId?: string;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

  const items = useMemo<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    let previousDay: string | null = null;
    let previousAuthor: string | undefined = undefined;
    for (const msg of messages) {
      const dayKey = getDayKey(msg);
      if (dayKey !== previousDay) {
        out.push({ kind: "day", id: `day-${dayKey}-${out.length}`, label: formatDayLabel(dayKey) });
        previousDay = dayKey;
        previousAuthor = undefined;
      }

      const isSameAuthorAsPrev = !!previousAuthor && previousAuthor === msg.authorUid;
      const showAuthorName = !isSameAuthorAsPrev;
      const showAvatar = !isSameAuthorAsPrev;

      out.push({
        kind: "msg",
        id: msg.id,
        msg,
        showAvatar,
        showAuthorName,
      });

      previousAuthor = msg.authorUid;
    }
    return out;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setShowJump(distanceFromBottom > 260);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const jumpToLatest = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-4 py-4 [background:radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%),linear-gradient(180deg,#020617,#020617)]"
      >
        <div className="space-y-3">
          {items.map((item) => {
            if (item.kind === "day") {
              return (
                <div key={item.id} className="flex justify-center pt-2 pb-1">
                  <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-zinc-200">
                    {item.label}
                  </div>
                </div>
              );
            }

            const isMe = item.msg.authorUid === currentUserId;
            return (
              <MessageBubble
                key={item.id}
                msg={item.msg}
                isMe={isMe}
                showAvatar={!isMe && item.showAvatar}
                showAuthorName={!isMe && item.showAuthorName}
              />
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-100 backdrop-blur hover:bg-emerald-500/20"
        >
          <ArrowDown className="h-4 w-4" />
          Latest
        </button>
      )}
    </div>
  );
}

