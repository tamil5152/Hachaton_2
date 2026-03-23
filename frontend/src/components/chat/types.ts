export type ChatMessage = {
  id: string;
  authorUid?: string;
  authorName?: string;
  authorPhotoURL?: string | null;
  createdAt?: { toDate?: () => Date } | null;
  type?: "text" | "sticker" | "gif" | "image" | "file" | "audio" | string;
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

