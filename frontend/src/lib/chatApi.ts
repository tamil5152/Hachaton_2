import type { ChatMessage } from "../components/chat/types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:9090/api";

type BackendChatMessage = {
  id: string;
  authorUid?: string;
  authorName?: string;
  authorPhotoURL?: string | null;
  type?: string;
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
};

type ChatMessagePayload = {
  authorUid?: string;
  authorName?: string;
  authorPhotoURL?: string | null;
  type?: string;
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

const toChatMessage = (message: BackendChatMessage): ChatMessage => ({
  ...message,
  createdAt: message.createdAt
    ? {
        toDate: () => new Date(message.createdAt as string),
      }
    : null,
});

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchChatMessages() {
  const response = await fetch(`${API_BASE}/chat/messages`);
  const data = await parseJson<BackendChatMessage[]>(response);
  return data.map(toChatMessage);
}

export async function seedChatMessages() {
  const response = await fetch(`${API_BASE}/chat/seed`, {
    method: "POST",
  });
  const data = await parseJson<BackendChatMessage[]>(response);
  return data.map(toChatMessage);
}

export async function createChatMessage(payload: ChatMessagePayload) {
  const response = await fetch(`${API_BASE}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<BackendChatMessage>(response);
  return toChatMessage(data);
}

export async function uploadChatAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/chat/upload`, {
    method: "POST",
    body: formData,
  });
  return parseJson<{ fileName: string; url: string; mimeType: string; fileSize: number }>(response);
}
