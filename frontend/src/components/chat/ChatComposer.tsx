import React from "react";
import {
  Image,
  Loader2,
  Mic,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  SmilePlus,
  Square,
  Upload,
} from "lucide-react";
import type { EmojiEntry, GifResult } from "./composerTypes";

export function ChatComposer({
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
}: {
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
}) {
  const disabled = !canCollaborate || isUploadingAttachment;
  const skinToneOptions = [
    { id: "", label: "Default" },
    { id: "\u{1F3FB}", label: "Light" },
    { id: "\u{1F3FC}", label: "Medium-light" },
    { id: "\u{1F3FD}", label: "Medium" },
    { id: "\u{1F3FE}", label: "Medium-dark" },
    { id: "\u{1F3FF}", label: "Dark" },
  ];

  return (
    <form onSubmit={onSend} className="border-t border-zinc-800 bg-zinc-950/90 px-3 py-3">
      <input ref={chatImageInputRef} type="file" className="hidden" onChange={onPickImage} accept="image/*" />
      <input
        ref={chatDocumentInputRef}
        type="file"
        className="hidden"
        onChange={onPickDocument}
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xls,.xlsx,.ppt,.pptx,text/*,application/pdf"
      />
      <input ref={chatAudioInputRef} type="file" className="hidden" onChange={onPickAudio} accept="audio/*" />

      {(showStickerPicker || showGifPicker) && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur">
          {showStickerPicker && (
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Emoji</p>
                <span className="text-xs text-zinc-400">{filteredEmojis.length} results</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {emojiCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setEmojiCategory(category.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      emojiCategory === category.id
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={emojiQuery}
                  onChange={(event) => setEmojiQuery(event.target.value)}
                  placeholder="Search emoji (e.g. party, code, approve)"
                  className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Recent and category-aware</span>
                </div>
                <div className="flex items-center gap-1">
                  {skinToneOptions.map((tone) => (
                    <button
                      key={tone.id || "default"}
                      type="button"
                      title={tone.label}
                      onClick={() => setSelectedSkinTone(tone.id)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm ${
                        selectedSkinTone === tone.id
                          ? "border-emerald-400/40 bg-emerald-500/15"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      {tone.id ? `\u{1F44D}${tone.id}` : "\u{1F44D}"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {filteredEmojis.map((entry) => (
                  <button
                    key={`${entry.baseEmoji || entry.emoji}-${entry.category || "all"}`}
                    type="button"
                    onClick={() => onStickerSend(entry.emoji)}
                    className="rounded-xl bg-white/[0.03] px-2 py-2 text-2xl hover:bg-white/[0.08]"
                  >
                    {entry.emoji}
                  </button>
                ))}
              </div>
              {filteredEmojis.length === 0 && (
                <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-zinc-500">
                  {emojiCategory === "recent" ? "Your recent emojis will appear here after you use them." : "No emojis matched this search."}
                </div>
              )}
            </div>
          )}

          {showGifPicker && (
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">GIFs</p>
                <span className="text-xs text-zinc-400">{gifResults.length} options</span>
              </div>
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                {isSearchingGif ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : <Search className="h-4 w-4 text-zinc-500" />}
                <input
                  type="text"
                  value={gifQuery}
                  onChange={(event) => setGifQuery(event.target.value)}
                  placeholder="Search GIFs (e.g. coding, happy)"
                  className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
                />
              </div>
              <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Search and trending results</span>
                <span>Powered by Tenor</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gifResults.map((gif) => (
                  <button
                    key={gif.url}
                    type="button"
                    onClick={() => onGifSend(gif.url)}
                    className="overflow-hidden rounded-xl border border-white/10 text-left hover:border-white/20"
                  >
                    <img src={gif.previewUrl || gif.url} alt={gif.label} className="h-28 w-full object-cover" />
                    <div className="border-t border-white/10 px-3 py-2 text-xs text-zinc-200">{gif.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(isRecording || chatError || chatNotice || isUploadingAttachment) && (
        <div className="mb-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">
          {isRecording && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-300" />
                </span>
                <span className="font-semibold tracking-wide">Recording live...</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="h-2 w-1 rounded-full bg-red-300/70 animate-pulse" />
                <span className="h-4 w-1 rounded-full bg-red-300 animate-pulse [animation-delay:120ms]" />
                <span className="h-3 w-1 rounded-full bg-red-300/80 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          )}
          {isUploadingAttachment && (
            <p className="flex items-center gap-2 text-zinc-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </p>
          )}
          {chatNotice && <p className="text-emerald-300">{chatNotice}</p>}
          {chatError && <p className="text-red-300">{chatError}</p>}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900 px-2 py-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowStickerPicker((prev) => !prev);
              setShowGifPicker(false);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
              showStickerPicker ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-transparent text-zinc-300 hover:bg-white/[0.06]"
            } disabled:opacity-40`}
            aria-label="Emoji"
          >
            <SmilePlus className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setShowGifPicker((prev) => !prev);
              setShowStickerPicker(false);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
              showGifPicker ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-transparent text-zinc-300 hover:bg-white/[0.06]"
            } disabled:opacity-40`}
            aria-label="GIF"
          >
            <Image className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => chatImageInputRef.current?.click()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
            aria-label="Upload image"
          >
            <Upload className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => chatDocumentInputRef.current?.click()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
            aria-label="Attach document"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => chatAudioInputRef.current?.click()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
            aria-label="Attach audio"
          >
            <Mic className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 px-1">
            <input
              type="text"
              value={newMessage}
              disabled={!canCollaborate || isUploadingAttachment}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={canCollaborate ? "Message" : "Awaiting admin approval to chat"}
            className="h-9 w-full bg-transparent px-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onToggleRecording}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-semibold ${
              isRecording ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
            } disabled:opacity-40`}
            aria-label={isRecording ? "Stop recording" : "Record voice note"}
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span className="hidden sm:inline">{isRecording ? "Recording" : "Record"}</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={!canCollaborate || !newMessage.trim() || isUploadingAttachment}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-sm hover:bg-emerald-400 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
