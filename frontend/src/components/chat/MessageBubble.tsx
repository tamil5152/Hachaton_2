import React from "react";
import { FileCode2 } from "lucide-react";
import type { ChatMessage } from "./types";

const formatClockTime = (value?: { toDate?: () => Date } | null) => {
  const date = value?.toDate?.();
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const pretty = value >= 10 || unit === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${pretty} ${units[unit]}`;
};

type MessageBubbleProps = {
  msg: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  showAuthorName: boolean;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  showAvatar,
  showAuthorName,
}) => {
  const timeLabel = formatClockTime(msg.createdAt);

  return (
    <div className={`flex flex-col ${showAuthorName ? "mt-3" : "mt-1"} gap-1 ${isMe ? "items-end" : "items-start"}`}>
      {!isMe && showAuthorName && <span className="ml-10 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/70">{msg.authorName}</span>}

      <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
        {!isMe && (
          <div className={`h-8 w-8 ${showAvatar ? "opacity-100" : "opacity-0"} transition-opacity`}>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-zinc-900 text-xs font-semibold text-zinc-100">
              {msg.authorPhotoURL ? (
                <img src={msg.authorPhotoURL} alt={msg.authorName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                msg.authorName?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
          </div>
        )}

        <div
          className={[
            "relative max-w-[82%] sm:max-w-[72%] rounded-2xl px-3 py-2.5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
            isMe
              ? "rounded-br-sm bg-emerald-400/95 text-zinc-950"
              : "rounded-bl-sm bg-zinc-800/90 text-zinc-100",
          ].join(" ")}
        >
          {msg.type === "gif" && msg.mediaUrl && (
            <img src={msg.mediaUrl} alt="GIF" className="max-h-56 rounded-xl object-cover" />
          )}

          {msg.type === "image" && msg.mediaUrl && (
            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="block">
              <img src={msg.previewUrl || msg.mediaUrl} alt={msg.fileName || "Shared image"} className="max-h-64 rounded-xl object-cover" />
            </a>
          )}

          {msg.type === "audio" && msg.mediaUrl && (
            <audio controls className={`mt-0.5 w-[min(320px,70vw)] ${isMe ? "accent-zinc-950" : "accent-emerald-300"}`}>
              <source src={msg.mediaUrl} type={msg.mimeType || "audio/webm"} />
            </audio>
          )}

          {msg.type === "file" && msg.mediaUrl && (
            <a
              href={msg.mediaUrl}
              download={msg.fileName || "shared-file"}
              className={[
                "mt-0.5 flex items-center gap-3 rounded-xl border px-3 py-3",
                isMe ? "border-black/10 bg-black/5" : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isMe ? "bg-black/10" : "bg-black/20"}`}>
                <FileCode2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{msg.fileName || "Shared document"}</p>
                <p className="mt-0.5 text-xs opacity-75">{msg.fileSize ? formatBytes(msg.fileSize) : "Tap to download"}</p>
              </div>
            </a>
          )}

          {msg.type === "sticker" && <div className="text-4xl leading-none">{msg.text}</div>}

          {(msg.type === "text" || !msg.type) && (
            <p className="whitespace-pre-wrap break-words leading-6">{msg.text}</p>
          )}

          {!!timeLabel && (
            <div className={`mt-1 flex justify-end text-[10px] font-medium ${isMe ? "text-zinc-900/70" : "text-zinc-300/60"}`}>
              {timeLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

