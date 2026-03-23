import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  Copy,
  FileCode2,
  Github,
  Image,
  Loader2,
  Lock,
  MailPlus,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  ShieldCheck,
  SmilePlus,
  Search,
  Square,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { logActivity, upsertUserPresence } from "../lib/activity";
import { TeamChatPanel } from "../components/chat/TeamChatPanel";
import { unicodeEmojiCatalog } from "../components/chat/unicodeEmojiCatalog";
import type { ChatMessage } from "../components/chat/types";
import type { EmojiEntry } from "../components/chat/composerTypes";
import { createChatMessage, fetchChatMessages, seedChatMessages, uploadChatAttachment } from "../lib/chatApi";
import {
  approveJoinRequest,
  createWorkspaceInvite,
  rejectJoinRequest,
  resolveReviewRequest,
} from "../lib/workspace";

type Member = {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  status?: string;
  hasGithub?: boolean;
  membershipStatus?: string;
};

type FileRecord = {
  id: string;
  name: string;
  type?: string;
  content?: string;
  size?: number;
  mimeType?: string;
  updatedAt?: { toDate?: () => Date };
  lockedBy?: string | null;
};

type JoinRequest = {
  id: string;
  requestId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  status?: string;
  requestedAt?: { toDate?: () => Date };
};

type ReviewRequest = {
  id: string;
  reviewId: string;
  fileName?: string;
  requestedByName?: string;
  status?: string;
  requestedAt?: { toDate?: () => Date };
};

type WorkspaceInvite = {
  id: string;
  code: string;
  status?: string;
  createdByName?: string;
};

type GifResult = {
  label: string;
  url: string;
  previewUrl?: string;
};

const formatTime = (value?: { toDate?: () => Date }) => {
  if (!value?.toDate) return "Just now";
  return value.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getFileIcon = (name: string, className = "w-8 h-8") => {
  if (name.endsWith(".js")) return <div className={`${className} flex items-center justify-center rounded-lg bg-yellow-400/10`}><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" alt="JS" className="w-5 h-5" referrerPolicy="no-referrer" /></div>;
  if (name.endsWith(".ts")) return <div className={`${className} flex items-center justify-center rounded-lg bg-blue-400/10`}><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TS" className="w-5 h-5" referrerPolicy="no-referrer" /></div>;
  if (name.endsWith(".py")) return <div className={`${className} flex items-center justify-center rounded-lg bg-blue-500/10`}><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" alt="PY" className="w-5 h-5" referrerPolicy="no-referrer" /></div>;
  return <FileCode2 className={`${className} text-zinc-400`} />;
};

const CHAT_ATTACHMENT_LIMIT_BYTES = 8 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_TARGET_QUALITY = 0.84;
const GIF_SEARCH_KEY = (import.meta as any).env?.VITE_TENOR_API_KEY || "";
const GIF_SEARCH_CLIENT_KEY = (import.meta as any).env?.VITE_TENOR_CLIENT_KEY || "team-workspace-chat";
const EMOJI_RECENTS_STORAGE_KEY = "hackcollab-chat-recent-emojis";
const TONE_COMPATIBLE_EMOJIS = new Set([
  "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️",
  "✋", "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "💪", "🫶", "🙌", "👏", "🤲", "👐", "🫳", "🫴",
  "🧑‍💻", "👨‍💻", "👩‍💻", "🫡", "🤷", "🙋", "🙆", "🙅", "🤦", "🙍", "🙎",
]);
const EMOJI_CATEGORIES = [
  { id: "recent", label: "Recent", icon: "🕘" },
  { id: "smileys", label: "Smileys", icon: "😀" },
  { id: "people", label: "People", icon: "🧑" },
  { id: "gestures", label: "Gestures", icon: "👍" },
  { id: "objects", label: "Objects", icon: "💡" },
  { id: "symbols", label: "Symbols", icon: "✨" },
];

const stickerPresets = unicodeEmojiCatalog;

const defaultGifPresets: GifResult[] = [
  { label: "Celebrate", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWQ5aG5idnlnNW54cHNoM2YzdjEwdmJtdWFqbnFvYWo5d3R6bTB5biZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7aD2saalBwwftBIY/giphy.gif" },
  { label: "Typing", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnF4MjN6dnB3cHh1bW1mMjNnZHdyZ2U1MW8wMXY4d2UxNjJkZG8ybSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0HlBO7eyXzSZkJri/giphy.gif" },
  { label: "Approved", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb3Vla3J2NHBqZ2FvOWlmMW44YWpmYmRjNTVuZ2x4Y2RpOHV3a2JvZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f3iwJFOVOwuy7K6FFw/giphy.gif" },
  { label: "High Five", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { label: "Coding", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { label: "Success", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
];

const categorizeEmojiEntry = (entry: EmojiEntry) => {
  const searchable = `${entry.emoji} ${entry.keywords.join(" ")}`.toLowerCase();
  if (searchable.includes("thumb") || searchable.includes("hand") || searchable.includes("wave") || searchable.includes("clap") || searchable.includes("pray") || searchable.includes("gesture") || searchable.includes("point")) {
    return "gestures";
  }
  if (searchable.includes("developer") || searchable.includes("coder") || searchable.includes("person") || searchable.includes("man ") || searchable.includes("woman ") || searchable.includes("people") || searchable.includes("face") || searchable.includes("smile") || searchable.includes("laugh") || searchable.includes("sad") || searchable.includes("angry")) {
    return searchable.includes("developer") || searchable.includes("coder") || searchable.includes("person") || searchable.includes("man ") || searchable.includes("woman ") ? "people" : "smileys";
  }
  if (searchable.includes("tool") || searchable.includes("idea") || searchable.includes("folder") || searchable.includes("file") || searchable.includes("computer") || searchable.includes("phone") || searchable.includes("calendar") || searchable.includes("package") || searchable.includes("microphone")) {
    return "objects";
  }
  if (searchable.includes("symbol") || searchable.includes("sparkle") || searchable.includes("check") || searchable.includes("question") || searchable.includes("warning") || searchable.includes("heart") || searchable.includes("fire") || searchable.includes("star")) {
    return "symbols";
  }
  return "smileys";
};

const applySkinToneToEmoji = (emoji: string, skinTone: string) => {
  if (!skinTone || !TONE_COMPATIBLE_EMOJIS.has(emoji)) return emoji;
  return emoji.includes("\u200D") ? emoji.replace(/(?=\u200D)/, skinTone) : `${emoji}${skinTone}`;
};

export default function TeamWorkspace() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const chatDocumentInputRef = useRef<HTMLInputElement>(null);
  const chatAudioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>([]);
  const [currentRole, setCurrentRole] = useState("member");
  const [membershipStatus, setMembershipStatus] = useState("approved");
  const [hasGithub, setHasGithub] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState("newFile.js");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [isSearchingGif, setIsSearchingGif] = useState(false);
  const [gifResults, setGifResults] = useState<GifResult[]>(defaultGifPresets);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("recent");
  const [selectedSkinTone, setSelectedSkinTone] = useState("");
  const [recentEmojiBases, setRecentEmojiBases] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const currentUser = auth.currentUser;
    const userRef = doc(db, "users", currentUser.uid);
    setHasGithub(currentUser.providerData.some((p) => p.providerId === "github.com"));
    upsertUserPresence(currentUser).catch(console.error);

    const unsubUsers = onSnapshot(collection(db, "users"), async (snapshot) => {
      const nextMembers = snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Member, "id">) }));
      setMembers(nextMembers);
      const me = nextMembers.find((member) => member.id === currentUser.uid);
      const hasAdmin = nextMembers.some((member) => member.role === "admin");

      if (!hasAdmin) {
        await setDoc(userRef, { role: "admin", membershipStatus: "approved", joinedWorkspaceAt: serverTimestamp() }, { merge: true });
        setCurrentRole("admin");
        setMembershipStatus("approved");
        return;
      }

      setCurrentRole(me?.role || "member");
      setMembershipStatus(me?.membershipStatus || "approved");
    });


    const unsubFiles = onSnapshot(query(collection(db, "files"), orderBy("updatedAt", "desc")), (snapshot) => {
      setFiles(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<FileRecord, "id">) })));
    });

    const unsubInvites = onSnapshot(query(collection(db, "workspaceInvites"), orderBy("createdAt", "desc")), (snapshot) => {
      setWorkspaceInvites(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<WorkspaceInvite, "id">) })));
    });

    const unsubJoinRequests = onSnapshot(query(collection(db, "workspaceJoinRequests"), orderBy("requestedAt", "desc")), (snapshot) => {
      setJoinRequests(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<JoinRequest, "id">) })));
    });

    const unsubReviewRequests = onSnapshot(query(collection(db, "reviewRequests"), orderBy("requestedAt", "desc")), (snapshot) => {
      setReviewRequests(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<ReviewRequest, "id">) })));
    });

    return () => {
      unsubUsers();
      unsubFiles();
      unsubInvites();
      unsubJoinRequests();
      unsubReviewRequests();
      updateDoc(userRef, { status: "offline" }).catch(() => undefined);
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    const loadMessages = async (allowSeed = false) => {
      try {
        const nextMessages = await fetchChatMessages();
        if (!isMounted) return;
        setMessages(nextMessages);
        if (allowSeed && nextMessages.length === 0) {
          const seeded = await seedChatMessages();
          if (!isMounted) return;
          setMessages(seeded);
        }
        setChatError("");
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setChatError("Backend chat is unavailable. Please make sure the backend is running on port 9090.");
        }
      }
    };

    loadMessages(true);
    const intervalId = window.setInterval(() => {
      loadMessages(false);
    }, 2500);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(EMOJI_RECENTS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentEmojiBases(parsed.filter((value): value is string => typeof value === "string").slice(0, 24));
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EMOJI_RECENTS_STORAGE_KEY, JSON.stringify(recentEmojiBases.slice(0, 24)));
  }, [recentEmojiBases]);

  const isAdmin = currentRole === "admin";
  const canCollaborate = membershipStatus !== "pending" && membershipStatus !== "rejected";
  const approvedMembers = useMemo(() => members.filter((member) => (member.membershipStatus || "approved") === "approved"), [members]);
  const pendingJoinRequests = useMemo(() => joinRequests.filter((request) => request.status === "pending"), [joinRequests]);
  const pendingReviewRequests = useMemo(() => reviewRequests.filter((request) => request.status === "pending"), [reviewRequests]);
  const myPendingRequest = useMemo(() => joinRequests.find((request) => request.userId === auth.currentUser?.uid && request.status === "pending"), [joinRequests]);
  const filteredEmojis = useMemo(() => {
    const normalizedEntries: EmojiEntry[] = stickerPresets.map((entry) => ({
      ...entry,
      category: categorizeEmojiEntry(entry),
      baseEmoji: entry.emoji,
    }));
    const baseEntries =
      emojiCategory === "recent"
        ? recentEmojiBases.map((emoji) => normalizedEntries.find((entry) => entry.baseEmoji === emoji)).filter(Boolean) as EmojiEntry[]
        : normalizedEntries.filter((entry) => entry.category === emojiCategory);
    const searchedEntries = !emojiQuery.trim()
      ? baseEntries
      : normalizedEntries.filter((entry) => {
          const lowered = emojiQuery.trim().toLowerCase();
          return entry.emoji.includes(lowered) || entry.keywords.some((keyword) => keyword.includes(lowered)) || (entry.category || "").includes(lowered);
        });

    return searchedEntries.map((entry) => ({
      ...entry,
      emoji: applySkinToneToEmoji(entry.baseEmoji || entry.emoji, selectedSkinTone),
    }));
  }, [emojiCategory, emojiQuery, recentEmojiBases, selectedSkinTone]);

  useEffect(() => {
    if (!showGifPicker) return;

    const queryText = gifQuery.trim();
    const timeoutId = window.setTimeout(async () => {
      if (!GIF_SEARCH_KEY) {
        setGifResults(defaultGifPresets);
        setChatNotice("Add VITE_TENOR_API_KEY to unlock full GIF search and trending results.");
        setIsSearchingGif(false);
        return;
      }

      try {
        setIsSearchingGif(true);
        setChatError("");
        const endpoint = queryText
          ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(queryText)}&key=${GIF_SEARCH_KEY}&client_key=${GIF_SEARCH_CLIENT_KEY}&limit=40&media_filter=gif`
          : `https://tenor.googleapis.com/v2/featured?key=${GIF_SEARCH_KEY}&client_key=${GIF_SEARCH_CLIENT_KEY}&limit=40&media_filter=gif`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`GIF search failed with status ${response.status}`);
        const data = await response.json();
        const mapped: GifResult[] = (data?.results || [])
          .map((item: any) => {
            const tiny = item?.media_formats?.tinygif?.url;
            const full = item?.media_formats?.gif?.url;
            if (!full) return null;
            return { label: item?.content_description || queryText || "Trending GIF", url: full, previewUrl: tiny || full };
          })
          .filter(Boolean);
        setGifResults(mapped.length ? mapped : defaultGifPresets);
        setChatNotice(queryText ? "" : "Trending GIFs powered by Tenor.");
      } catch (error) {
        console.error(error);
        setGifResults(defaultGifPresets);
        setChatError("GIF search is currently unavailable. Showing quick picks instead.");
      } finally {
        setIsSearchingGif(false);
      }
    }, queryText ? 280 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [gifQuery, showGifPicker]);

  const getDataUrlBytes = (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1] || "";
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.floor((base64.length * 3) / 4) - padding;
  };

  const readFileAsDataUrl = (file: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const optimizeImageForChat = async (file: File) => {
    const rawDataUrl = await readFileAsDataUrl(file);
    const img = new window.Image();
    img.src = rawDataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Unable to process image"));
    });

    const ratio = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * ratio));
    const height = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return rawDataUrl;

    context.drawImage(img, 0, 0, width, height);
    const compressedDataUrl = canvas.toDataURL("image/webp", IMAGE_TARGET_QUALITY);
    return getDataUrlBytes(compressedDataUrl) < getDataUrlBytes(rawDataUrl) ? compressedDataUrl : rawDataUrl;
  };

  const uploadChatFileAndGetUrl = async (file: File) => {
    const uploaded = await uploadChatAttachment(file);
    return uploaded.url;
  };

  const handleCreateInvite = async () => {
    if (!auth.currentUser || !isAdmin) return;
    setCreatingInvite(true);
    try {
      const code = await createWorkspaceInvite(auth.currentUser);
      setInviteLink(`${window.location.origin}/auth?invite=${code}`);
      await logActivity(auth.currentUser, {
        type: "invite_created",
        title: "Workspace invite created",
        detail: `${auth.currentUser.displayName || auth.currentUser.email} created a secure invite link.`,
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (link: string) => {
    await navigator.clipboard.writeText(link);
  };

  const handleApproveMember = async (request: JoinRequest) => {
    if (!auth.currentUser) return;
    await approveJoinRequest(request.requestId, request.userId, request.role || "developer");
    await logActivity(auth.currentUser, {
      type: "access_approved",
      title: "Workspace access approved",
      detail: `${request.userName || request.userEmail} was approved by an administrator.`,
    });
  };

  const handleRejectMember = async (request: JoinRequest) => {
    await rejectJoinRequest(request.requestId, request.userId);
  };

  const handleApproveReview = async (request: ReviewRequest, status: "approved" | "changes_requested") => {
    await resolveReviewRequest(request.reviewId, status);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newMessage.trim() || !canCollaborate) return;
    const isSent = await addChatMessage({ type: "text", text: newMessage.trim() });
    if (isSent) setNewMessage("");
  };

  const addChatMessage = async (payload: Record<string, unknown>) => {
    if (!auth.currentUser) return false;
    try {
      setChatError("");
      const created = await createChatMessage({
        ...payload,
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "User",
        authorPhotoURL: auth.currentUser.photoURL || null,
      });
      setMessages((current) => [...current, created]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      await logActivity(auth.currentUser, {
        type: "message_sent",
        title: "New team message",
        detail: `${auth.currentUser.displayName || auth.currentUser.email} shared a ${String(payload.type || "message")} in team chat.`,
      });
      return true;
    } catch (error) {
      console.error(error);
      setChatError("Message failed to send. Please check your backend connection and try again.");
      return false;
    }
  };

  const handleStickerSend = async (sticker: string) => {
    if (!canCollaborate) return;
    const baseEmoji = sticker.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
    setRecentEmojiBases((current) => [baseEmoji, ...current.filter((entry) => entry !== baseEmoji)].slice(0, 24));
    const isSent = await addChatMessage({ type: "sticker", text: sticker });
    if (isSent) setShowStickerPicker(false);
  };

  const handleGifSend = async (gifUrl: string) => {
    if (!canCollaborate) return;
    const isSent = await addChatMessage({ type: "gif", mediaUrl: gifUrl });
    if (isSent) setShowGifPicker(false);
  };

  const handleChatAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>, attachmentKind: "image" | "document" | "audio") => {
    if (!e.target.files?.length || !canCollaborate) return;
    setIsUploadingAttachment(true);
    setChatError("");
    setChatNotice("");
    try {
      for (const file of Array.from(e.target.files as FileList)) {
        const lowerName = file.name.toLowerCase();
        const isAllowed =
          attachmentKind === "image"
            ? file.type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((extension) => lowerName.endsWith(extension))
            : attachmentKind === "audio"
              ? file.type.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"].some((extension) => lowerName.endsWith(extension))
              : file.type.startsWith("text/") || file.type.includes("pdf") || file.type.includes("document") || file.type.includes("sheet") || file.type.includes("presentation") || file.type.includes("json") || file.type.includes("csv") || [".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".json", ".xls", ".xlsx", ".ppt", ".pptx", ".rtf"].some((extension) => lowerName.endsWith(extension));

        if (!isAllowed) {
          setChatError(`"${file.name}" is not a valid ${attachmentKind} file.`);
          continue;
        }
        if (file.size > CHAT_ATTACHMENT_LIMIT_BYTES) {
          setChatError(`"${file.name}" is too large. Please keep files below ${Math.round(CHAT_ATTACHMENT_LIMIT_BYTES / (1024 * 1024))} MB.`);
          continue;
        }

        const uploadedUrl = await uploadChatFileAndGetUrl(file);
        let thumbnailUrl: string | null = null;
        if (attachmentKind === "image") {
          const optimizedImageDataUrl = await optimizeImageForChat(file);
          if (getDataUrlBytes(optimizedImageDataUrl) <= 320 * 1024) {
            thumbnailUrl = optimizedImageDataUrl;
          }
        }

        const isSent = await addChatMessage({
          type: attachmentKind === "image" ? "image" : attachmentKind === "audio" ? "audio" : "file",
          mediaUrl: uploadedUrl,
          previewUrl: thumbnailUrl,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
        if (isSent) {
          setChatNotice(`${file.name} sent`);
        }
      }
    } catch (error) {
      console.error(error);
      setChatError("Upload failed. Please try again.");
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
    }
  };

  const toggleRecording = async () => {
    if (!canCollaborate) return;
    try {
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Audio recording is not supported in this browser. Please upload an audio file instead.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        if (voiceFile.size > CHAT_ATTACHMENT_LIMIT_BYTES) {
          setChatError("Voice note is too large. Please record a shorter message.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        uploadChatFileAndGetUrl(voiceFile)
          .then((downloadUrl) =>
            addChatMessage({
              type: "audio",
              mediaUrl: downloadUrl,
              fileName: voiceFile.name,
              mimeType: "audio/webm",
              fileSize: voiceFile.size,
            }),
          )
          .then((isSent) => {
            if (isSent) setChatNotice("Voice note sent");
          })
          .catch((error) => {
            console.error(error);
            setChatError("Voice note upload failed. Please try again.");
          });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      alert("Microphone access failed. Please allow permission or upload an audio file instead.");
      setIsRecording(false);
    }
  };

  const handleFileClick = async (file: FileRecord) => {
    if (!auth.currentUser || !canCollaborate) return;
    if (file.lockedBy && file.lockedBy !== auth.currentUser.uid) {
      alert("This file is currently being edited by someone else.");
      return;
    }
    await updateDoc(doc(db, "files", file.id), { lockedBy: auth.currentUser.uid });
    navigate(`/editor?fileId=${file.id}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !auth.currentUser || !canCollaborate) return;
    for (let i = 0; i < e.target.files.length; i += 1) {
      const file = e.target.files[i];
      const lowerName = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const type = file.name.split(".").pop() || "txt";
        await addDoc(collection(db, "files"), {
          name: file.name,
          type,
          content,
          mimeType: file.type || "text/plain",
          size: Math.max(1, Math.round(file.size / 1024)),
          updatedAt: serverTimestamp(),
          lockedBy: null,
        });
        await logActivity(auth.currentUser!, {
          type: "file_uploaded",
          title: "File uploaded",
          detail: `${auth.currentUser?.displayName || auth.currentUser?.email} uploaded ${file.name}.`,
          metadata: { fileName: file.name, fileType: type },
        });
      };
      const textLike =
        file.type.startsWith("text/") ||
        file.type.includes("json") ||
        file.type.includes("csv") ||
        file.type.includes("xml") ||
        file.type.includes("yaml") ||
        file.type.includes("markdown") ||
        [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".sql", ".rtf"].some((extension) => lowerName.endsWith(extension));
      if (textLike) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNewFile = () => {
    if (!auth.currentUser || !canCollaborate) return;
    setShowNewFileModal(true);
  };

  const submitNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newFileNameInput.trim() || !canCollaborate) return;
    const fileName = newFileNameInput.trim();
    const type = fileName.split(".").pop() || "txt";
    const docRef = await addDoc(collection(db, "files"), {
      name: fileName,
      type,
      content: "// Start coding here\n",
      size: 1,
      updatedAt: serverTimestamp(),
      lockedBy: null,
    });
    await logActivity(auth.currentUser, {
      type: "file_created",
      title: "File created",
      detail: `${auth.currentUser.displayName || auth.currentUser.email} created ${fileName}.`,
      metadata: { fileName, fileType: type },
    });
    setShowNewFileModal(false);
    navigate(`/editor?fileId=${docRef.id}`);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_28%),linear-gradient(180deg,#121216,#09090b)] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-20" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Team Operations
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Realtime workspace control for members, approvals, and secure invites</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">Dummy invite cards and placeholder approvals have been replaced with live workspace data from your project services.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Workspace role</p>
              <p className="mt-1 text-sm font-medium text-white">{isAdmin ? "Administrator" : "Member"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Access status</p>
              <p className="mt-1 text-sm font-medium text-white capitalize">{membershipStatus}</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
                <UserPlus className="h-4 w-4" />
                Invite Members
              </button>
            )}
          </div>
        </div>
      </section>

      {!canCollaborate && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <h2 className="text-base font-semibold text-amber-100">Waiting for admin approval</h2>
              <p className="mt-1 text-sm text-amber-100/80">Your workspace access request is pending{myPendingRequest ? ` since ${formatTime(myPendingRequest.requestedAt)}` : ""}. Collaboration tools will unlock after approval.</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col gap-6">
          {isAdmin && (
            <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,#111114,#0b0b0d)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Admin Queue</h2>
              </div>
              <div className="mt-4 space-y-3">
                {pendingJoinRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-white">{request.userName || request.userEmail}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">Access Request</p>
                    <p className="mt-2 text-sm text-zinc-400">{request.userEmail}</p>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => handleApproveMember(request)} className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200">Approve</button>
                      <button onClick={() => handleRejectMember(request)} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06]">Reject</button>
                    </div>
                  </div>
                ))}
                {pendingReviewRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-white">{request.fileName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">Review Submission</p>
                    <p className="mt-2 text-sm text-zinc-400">Submitted by {request.requestedByName}</p>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => handleApproveReview(request, "approved")} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400">Approve</button>
                      <button onClick={() => handleApproveReview(request, "changes_requested")} className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06]">Request Changes</button>
                    </div>
                  </div>
                ))}
                {pendingJoinRequests.length === 0 && pendingReviewRequests.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">No pending approvals right now.</div>}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,#111114,#0b0b0d)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col min-h-[280px]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300"><Users className="h-4 w-4 text-zinc-400" />Members</h2>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-400">{approvedMembers.length}</span>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {approvedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-sm font-medium text-zinc-100">
                        {member.photoURL ? <img src={member.photoURL} alt={member.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : member.displayName?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-950 ${member.status === "online" ? "bg-emerald-500" : "bg-zinc-500"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{member.displayName || member.email}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{member.role || "member"}</p>
                    </div>
                  </div>
                  {member.hasGithub && <Github className="h-4 w-4 text-zinc-400" />}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,#111114,#0b0b0d)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300"><Github className="h-4 w-4 text-zinc-400" />GitHub Integration</h2>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
              {hasGithub ? (
                <>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800"><Github className="h-6 w-6 text-zinc-200" /></div>
                  <p className="mt-3 text-sm font-medium text-white">GitHub connected</p>
                  <p className="mt-1 text-xs leading-6 text-zinc-500">This member account is ready for repository-connected workflows.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-300">No GitHub account linked yet.</p>
                  <button onClick={() => navigate("/profile")} className="mt-3 text-xs font-semibold text-blue-300 hover:text-blue-200">Connect in Profile</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex min-h-0">
          <PanelGroup direction="horizontal" className="flex w-full gap-4">
            <Panel defaultSize={65} minSize={40}>
              <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,#111114,#0b0b0d)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300"><FileCode2 className="h-4 w-4 text-zinc-400" />Shared Files</h2>
                    <p className="mt-1 text-sm text-zinc-500">Realtime workspace assets available to approved members.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                    <button disabled={!canCollaborate} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[0.06] disabled:opacity-40"><Upload className="h-4 w-4" />Upload</button>
                    <button disabled={!canCollaborate} onClick={handleNewFile} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"><Plus className="h-4 w-4" />New File</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {files.filter((file) => file.id !== "initial-check" && file.type !== "folder").map((file) => (
                      <div key={file.id} onClick={() => handleFileClick(file)} className={`relative rounded-2xl border p-4 transition-all ${canCollaborate ? "cursor-pointer" : "cursor-not-allowed"} ${file.lockedBy && file.lockedBy !== auth.currentUser?.uid ? "border-zinc-800/50 bg-zinc-950/50 opacity-75" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"}`}>
                        <div className="mb-3 flex items-start justify-between">
                          {getFileIcon(file.name, "w-10 h-10")}
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{file.type}</span>
                        </div>
                        {file.mimeType?.startsWith("image/") && file.content?.startsWith("data:image/") && (
                          <img src={file.content} alt={file.name} className="mb-3 h-32 w-full rounded-xl border border-white/8 object-cover" />
                        )}
                        {file.mimeType?.startsWith("audio/") && file.content?.startsWith("data:audio/") && (
                          <audio controls className="mb-3 w-full">
                            <source src={file.content} type={file.mimeType} />
                          </audio>
                        )}
                        <h3 className="pr-6 text-sm font-medium text-zinc-200">{file.name}</h3>
                        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                          <span>{file.size || 1} KB</span>
                          <span>{formatTime(file.updatedAt)}</span>
                        </div>
                        {file.lockedBy && <div className="absolute right-4 top-4"><Lock className={`h-4 w-4 ${file.lockedBy === auth.currentUser?.uid ? "text-emerald-400" : "text-amber-500"}`} /></div>}
                      </div>
                    ))}
                    {files.filter((file) => file.id !== "initial-check" && file.type !== "folder").length === 0 && <div className="col-span-2 rounded-2xl border-2 border-dashed border-zinc-800 py-12 text-center"><FileCode2 className="mx-auto mb-3 h-8 w-8 text-zinc-600" /><p className="text-sm text-zinc-400">No shared files yet.</p><p className="mt-1 text-xs text-zinc-500">Create or upload a file to start collaborating.</p></div>}
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="mx-1 w-[3px] cursor-col-resize rounded-full bg-zinc-800 hover:bg-zinc-600" />

            <Panel defaultSize={35} minSize={25}>
              <TeamChatPanel
                title="Team Chat"
                subtitle="Realtime workspace discussion with stickers, GIFs, voice notes, and document sharing."
                messages={messages}
                currentUserId={auth.currentUser?.uid}
                endRef={messagesEndRef}
                canCollaborate={canCollaborate}
                isUploadingAttachment={isUploadingAttachment}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSend={handleSendMessage}
                onToggleRecording={toggleRecording}
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
                emojiCategories={EMOJI_CATEGORIES}
                selectedSkinTone={selectedSkinTone}
                setSelectedSkinTone={setSelectedSkinTone}
                filteredEmojis={filteredEmojis}
                onStickerSend={handleStickerSend}
                gifQuery={gifQuery}
                setGifQuery={setGifQuery}
                isSearchingGif={isSearchingGif}
                gifResults={gifResults}
                onGifSend={handleGifSend}
                chatImageInputRef={chatImageInputRef}
                chatDocumentInputRef={chatDocumentInputRef}
                chatAudioInputRef={chatAudioInputRef}
                onPickImage={(event) => handleChatAttachmentUpload(event, "image")}
                onPickDocument={(event) => handleChatAttachmentUpload(event, "document")}
                onPickAudio={(event) => handleChatAttachmentUpload(event, "audio")}
                approvedMemberCount={approvedMembers.length}
                onlineMemberCount={approvedMembers.filter((m) => m.status === "online").length}
              />
            </Panel>
          </PanelGroup>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Invite Members</h3>
                <p className="mt-1 text-sm text-zinc-500">Generate secure links and approve join requests from the admin queue.</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Create a new invite link</p>
                    <p className="mt-1 text-sm text-zinc-500">Share it with a candidate, then approve the resulting access request.</p>
                  </div>
                  <button onClick={handleCreateInvite} disabled={creatingInvite} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"><MailPlus className="h-4 w-4" />{creatingInvite ? "Generating..." : "Generate Link"}</button>
                </div>
                {inviteLink && (
                  <div className="mt-4 flex gap-2">
                    <input readOnly value={inviteLink} className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200" />
                    <button onClick={() => handleCopyInvite(inviteLink)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"><Copy className="h-4 w-4" />Copy</button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {workspaceInvites.filter((invite) => invite.status === "active").map((invite) => {
                  const link = `${window.location.origin}/auth?invite=${invite.code}`;
                  return (
                    <div key={invite.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{invite.code}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">Created by {invite.createdByName || "Admin"}</p>
                        </div>
                        <button onClick={() => handleCopyInvite(link)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"><Copy className="h-4 w-4" />Copy Link</button>
                      </div>
                    </div>
                  );
                })}
                {workspaceInvites.filter((invite) => invite.status === "active").length === 0 && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">No active invite links yet.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <h3 className="text-lg font-semibold text-white">Create New File</h3>
              <button onClick={() => setShowNewFileModal(false)} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitNewFile} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">File Name</label>
                <input type="text" value={newFileNameInput} onChange={(e) => setNewFileNameInput(e.target.value)} placeholder="e.g., service.ts" autoFocus className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewFileModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">Create File</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




