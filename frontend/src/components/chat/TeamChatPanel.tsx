import React from "react";
import { MessageSquare, ShieldCheck, Users } from "lucide-react";
import type { ChatMessage } from "./types";
import type { EmojiEntry, GifResult } from "./composerTypes";
import { MessageList } from "./MessageList";
import { ChatComposer } from "./ChatComposer";

export function TeamChatPanel({
  title = "Team Chat",
  subtitle = "Fast, professional team communication.",
  messages,
  currentUserId,
  endRef,
  canCollaborate,
  isUploadingAttachment,
  newMessage,
  setNewMessage,
  onSend,
  onToggleRecording,
  isRecording,
  chatError,
  chatNotice,
  showStickerPicker,
  setShowStickerPicker,
  showGifPicker,
  setShowGifPicker,
  emojiQuery,
  setEmojiQuery,
  emojiCategory,
  setEmojiCategory,
  emojiCategories,
  selectedSkinTone,
  setSelectedSkinTone,
  filteredEmojis,
  onStickerSend,
  gifQuery,
  setGifQuery,
  isSearchingGif,
  gifResults,
  onGifSend,
  chatImageInputRef,
  chatDocumentInputRef,
  chatAudioInputRef,
  onPickImage,
  onPickDocument,
  onPickAudio,
  approvedMemberCount,
  onlineMemberCount,
}: {
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  currentUserId?: string;
  endRef: React.RefObject<HTMLDivElement | null>;

  canCollaborate: boolean;
  isUploadingAttachment: boolean;
  newMessage: string;
  setNewMessage: (value: string) => void;
  onSend: (e: React.FormEvent) => void;

  onToggleRecording: () => void;
  isRecording: boolean;

  chatError: string;
  chatNotice: string;

  showStickerPicker: boolean;
  setShowStickerPicker: (next: boolean | ((prev: boolean) => boolean)) => void;
  showGifPicker: boolean;
  setShowGifPicker: (next: boolean | ((prev: boolean) => boolean)) => void;

  emojiQuery: string;
  setEmojiQuery: (value: string) => void;
  emojiCategory: string;
  setEmojiCategory: (value: string) => void;
  emojiCategories: { id: string; label: string; icon: string }[];
  selectedSkinTone: string;
  setSelectedSkinTone: (value: string) => void;
  filteredEmojis: EmojiEntry[];
  onStickerSend: (emoji: string) => void;

  gifQuery: string;
  setGifQuery: (value: string) => void;
  isSearchingGif: boolean;
  gifResults: GifResult[];
  onGifSend: (gifUrl: string) => void;

  chatImageInputRef: React.RefObject<HTMLInputElement | null>;
  chatDocumentInputRef: React.RefObject<HTMLInputElement | null>;
  chatAudioInputRef: React.RefObject<HTMLInputElement | null>;
  onPickImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPickDocument: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPickAudio: (event: React.ChangeEvent<HTMLInputElement>) => void;

  approvedMemberCount: number;
  onlineMemberCount: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 flex flex-col min-h-0 overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <h2 className="truncate text-sm font-semibold text-zinc-100">{title}</h2>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-zinc-100">{onlineMemberCount}</span>
              <span className="text-zinc-500">/</span>
              <span className="font-semibold text-zinc-100">{approvedMemberCount}</span>
            </div>
          </div>
        </div>
      </div>

      <MessageList messages={messages} currentUserId={currentUserId} endRef={endRef} />

      <ChatComposer
        canCollaborate={canCollaborate}
        isUploadingAttachment={isUploadingAttachment}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSend={onSend}
        onToggleRecording={onToggleRecording}
        isRecording={isRecording}
        chatError={chatError}
        chatNotice={chatNotice}
        showStickerPicker={showStickerPicker}
        setShowStickerPicker={setShowStickerPicker}
        showGifPicker={showGifPicker}
        setShowGifPicker={setShowGifPicker}
        emojiQuery={emojiQuery}
        setEmojiQuery={setEmojiQuery}
        emojiCategory={emojiCategory}
        setEmojiCategory={setEmojiCategory}
        emojiCategories={emojiCategories}
        selectedSkinTone={selectedSkinTone}
        setSelectedSkinTone={setSelectedSkinTone}
        filteredEmojis={filteredEmojis}
        onStickerSend={onStickerSend}
        gifQuery={gifQuery}
        setGifQuery={setGifQuery}
        isSearchingGif={isSearchingGif}
        gifResults={gifResults}
        onGifSend={onGifSend}
        chatImageInputRef={chatImageInputRef}
        chatDocumentInputRef={chatDocumentInputRef}
        chatAudioInputRef={chatAudioInputRef}
        onPickImage={onPickImage}
        onPickDocument={onPickDocument}
        onPickAudio={onPickAudio}
      />
    </div>
  );
}
