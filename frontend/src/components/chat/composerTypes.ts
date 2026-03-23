export type GifResult = {
  label: string;
  url: string;
  previewUrl?: string;
};

export type EmojiEntry = {
  emoji: string;
  keywords: string[];
  category?: string;
  baseEmoji?: string;
};
