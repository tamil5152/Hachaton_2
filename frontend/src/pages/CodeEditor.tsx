import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Eye,
  FileCode2,
  FilePlus2,
  Files,
  FolderOpen,
  FolderPlus,
  Github,
  GitBranch,
  GitCommit,
  Keyboard,
  LayoutGrid,
  Maximize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  TerminalSquare,
  Users,
  Wand2,
  X,
  Zap,
  CheckCheck,
  AlertCircle,
  Wifi,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { logActivity } from "../lib/activity";
import { createReviewRequest } from "../lib/workspace";

// ─── Types ────────────────────────────────────────────────────────────────────
type CloudEntry = {
  id: string;
  name: string;
  type?: string;
  content?: string;
  folderId?: string | null;
  updatedAt?: { toDate?: () => Date };
};

type WorkspaceNode = {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  source: "local" | "cloud";
  handle?: any;
  fileId?: string;
  children?: WorkspaceNode[];
};

type OpenFile = {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  source: "local" | "cloud";
  handle?: any;
  fileId?: string;
  isDirty?: boolean;
};

type AssistantMessage = {
  role: "assistant" | "user";
  content: string;
  timestamp?: Date;
};

type AssistantMode = "implement" | "refactor" | "debug" | "explain";
type AssistantScope = "current-file" | "open-tabs" | "entire-project";
type AssistantProvider = "claude" | "chatgpt" | "gemini" | "deepseek" | "cursor";

type CollabUser = {
  id: string;
  name: string;
  color: string;
  line: number;
  col: number;
  isTyping: boolean;
};

type ReviewRequest = {
  id: string;
  reviewId: string;
  fileName?: string;
  requestedByName?: string;
  status?: string;
  requestedAt?: { toDate?: () => Date };
};

type AssistantChange = {
  path: string;
  content: string;
  note?: string;
};

// ─── Collab user colours ──────────────────────────────────────────────────────
const COLLAB_COLORS = [
  "#60a5fa", "#34d399", "#f472b6", "#fb923c", "#a78bfa", "#facc15",
];

const MOCK_COLLAB_USERS: CollabUser[] = [
  { id: "u1", name: "Alex", color: COLLAB_COLORS[0], line: 12, col: 24, isTyping: true },
  { id: "u2", name: "Priya", color: COLLAB_COLORS[1], line: 28, col: 8,  isTyping: false },
  { id: "u3", name: "Sam",   color: COLLAB_COLORS[2], line: 45, col: 16, isTyping: true },
];

// ─── Provider profiles ────────────────────────────────────────────────────────
const assistantProviderProfiles: Record<
  AssistantProvider,
  { label: string; accent: string; dot: string; summary: string; operatingStyle: string }
> = {
  claude:   { label: "Claude",   dot: "bg-orange-400",   accent: "border-orange-400/40 bg-orange-500/10 text-orange-100",   summary: "Thoughtful planner, structured reasoning.",         operatingStyle: "Think deeply, explain tradeoffs, propose staged multi-file edits." },
  chatgpt:  { label: "ChatGPT",  dot: "bg-emerald-400",  accent: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100", summary: "Balanced copilot for fast coding loops.",           operatingStyle: "Be practical, fast, code-forward. Prefer direct implementation." },
  gemini:   { label: "Gemini",   dot: "bg-blue-400",     accent: "border-blue-400/40 bg-blue-500/10 text-blue-100",         summary: "Workspace-wide agent with strong synthesis.",       operatingStyle: "Use broad project context, connect distant files, optimize for synthesis." },
  deepseek: { label: "DeepSeek", dot: "bg-cyan-400",     accent: "border-cyan-400/40 bg-cyan-500/10 text-cyan-100",         summary: "Debug-first reasoning for code repair.",            operatingStyle: "Bias toward root-cause analysis, keep fixes minimal but correct." },
  cursor:   { label: "Cursor",   dot: "bg-fuchsia-400",  accent: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100", summary: "Inline copilot focused on edit momentum.",         operatingStyle: "Inspect, patch, keep users moving with multi-file suggestions." },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const detectLanguage = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
    json: "json", html: "html", css: "css", scss: "scss", py: "python",
    md: "markdown", java: "java", sh: "shell", ps1: "powershell", go: "go",
    rs: "rust", cpp: "cpp", c: "c", rb: "ruby", php: "php", sql: "sql",
    xml: "xml", yaml: "yaml", yml: "yaml", toml: "toml",
  };
  return ext ? map[ext] || "plaintext" : "plaintext";
};

const getLanguageIcon = (lang: string) => {
  const icons: Record<string, string> = {
    javascript: "🟨", typescript: "🔷", python: "🐍", java: "☕",
    html: "🌐", css: "🎨", json: "📋", markdown: "📝",
    rust: "🦀", go: "🐹", cpp: "⚙️", shell: "💻",
  };
  return icons[lang] || "📄";
};

const getLanguageColor = (lang: string) => {
  const colors: Record<string, string> = {
    javascript: "#f7df1e", typescript: "#3178c6", python: "#3572a5", java: "#b07219",
    html: "#e34c26", css: "#563d7c", json: "#9b9b9b", rust: "#dea584",
    go: "#00add8", cpp: "#f34b7d", shell: "#89e051",
  };
  return colors[lang] || "#6e7681";
};

const formatTime = (d?: Date) => {
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const sortNodes = (nodes: WorkspaceNode[]) =>
  [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

const buildCloudTree = (entries: CloudEntry[]) => {
  const folders = new Map<string, WorkspaceNode>();
  const roots: WorkspaceNode[] = [];
  entries.filter((e) => e.type === "folder").forEach((folder) => {
    folders.set(folder.id, { id: `cloud-folder-${folder.id}`, name: folder.name, path: folder.name, kind: "directory", source: "cloud", children: [] });
  });
  entries.filter((e) => e.type !== "folder").forEach((file) => {
    const node: WorkspaceNode = {
      id: `cloud-file-${file.id}`, name: file.name,
      path: file.folderId && folders.has(file.folderId) ? `${folders.get(file.folderId)?.name}/${file.name}` : file.name,
      kind: "file", source: "cloud", fileId: file.id,
    };
    if (file.folderId && folders.has(file.folderId)) folders.get(file.folderId)?.children?.push(node);
    else roots.push(node);
  });
  folders.forEach((folder) => { folder.children = sortNodes(folder.children || []); roots.push(folder); });
  return sortNodes(roots);
};

const summarizeNodes = (nodes: WorkspaceNode[], depth = 0): string[] => {
  const lines: string[] = [];
  nodes.forEach((node) => {
    lines.push(`${"  ".repeat(depth)}- ${node.name}${node.kind === "directory" ? "/" : ""}`);
    if (node.children?.length) lines.push(...summarizeNodes(node.children, depth + 1));
  });
  return lines;
};

const findNodeByPath = (nodes: WorkspaceNode[], path: string): WorkspaceNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children?.length) {
      const match = findNodeByPath(node.children, path);
      if (match) return match;
    }
  }
  return null;
};

const flattenNodes = (nodes: WorkspaceNode[]): WorkspaceNode[] => {
  const list: WorkspaceNode[] = [];
  nodes.forEach((node) => { list.push(node); if (node.children?.length) list.push(...flattenNodes(node.children)); });
  return list;
};

const isTextFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["js","jsx","ts","tsx","json","html","css","scss","md","txt","yml","yaml","py","java","c","cpp","h","hpp","go","rs","sh","ps1","csv","xml","sql","env","ini","toml"].includes(ext);
};

const getParentPath = (path: string) => { const parts = path.split("/").filter(Boolean); parts.pop(); return parts.join("/"); };

const filterWorkspaceNodes = (nodes: WorkspaceNode[], search: string): WorkspaceNode[] => {
  const term = search.trim().toLowerCase();
  if (!term) return nodes;
  const visit = (list: WorkspaceNode[]): WorkspaceNode[] => {
    const next: WorkspaceNode[] = [];
    list.forEach((node) => {
      const childMatches = node.children?.length ? visit(node.children) : [];
      const matches = node.name.toLowerCase().includes(term) || node.path.toLowerCase().includes(term);
      if (matches || childMatches.length) next.push({ ...node, children: node.kind === "directory" ? childMatches : node.children });
    });
    return next;
  };
  return visit(nodes);
};

// ─── ExplorerNode ─────────────────────────────────────────────────────────────
const ExplorerNode = ({ node, activePath, onOpen }: {
  node: WorkspaceNode; activePath: string; onOpen: (node: WorkspaceNode) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const isActive = activePath === node.path;
  const lang = detectLanguage(node.name);

  if (node.kind === "file") {
    return (
      <button
        onClick={() => onOpen(node)}
        className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-all duration-150 ${
          isActive
            ? "bg-blue-500/20 text-white border-l-2 border-blue-400 pl-[6px]"
            : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 border-l-2 border-transparent"
        }`}
      >
        <span className="text-xs shrink-0 w-4 text-center leading-none">{getLanguageIcon(lang)}</span>
        <span className="truncate flex-1">{node.name}</span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-zinc-200"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500/80" />
        <span className="truncate font-medium">{node.name}</span>
        {node.children?.length ? (
          <span className="ml-auto text-[10px] text-zinc-600">{node.children.length}</span>
        ) : null}
      </button>
      {expanded && node.children?.length ? (
        <div className="ml-3 space-y-0.5 border-l border-white/[0.06] pl-3 mt-0.5">
          {node.children.map((child) => (
            <ExplorerNode key={child.id} node={child} activePath={activePath} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ─── CollabAvatars ────────────────────────────────────────────────────────────
const CollabAvatars = ({ users }: { users: CollabUser[] }) => (
  <div className="flex items-center gap-1">
    {users.map((u) => (
      <div key={u.id} className="relative group" title={`${u.name} — Line ${u.line}`}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-zinc-900 transition-transform group-hover:scale-110"
          style={{ backgroundColor: u.color }}
        >
          {u.name[0]}
        </div>
        {u.isTyping && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-900 animate-pulse" />
        )}
      </div>
    ))}
    <div className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <Wifi className="w-3 h-3 text-emerald-400" />
      <span className="text-[10px] font-semibold text-emerald-300">LIVE</span>
    </div>
  </div>
);

// ─── TypingDots ───────────────────────────────────────────────────────────────
const TypingDots = () => (
  <span className="inline-flex items-end gap-0.5 h-4">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
      />
    ))}
  </span>
);

// ─── TerminalLine ─────────────────────────────────────────────────────────────
const TerminalLine = ({ line }: { line: string }) => {
  const isError = line.startsWith("Error:") || line.startsWith("✗");
  const isCmd = line.startsWith("$");
  const isSuccess = line.startsWith("✓") || line.startsWith("✔");
  const isWarn = line.startsWith("⚠");
  return (
    <div className={`font-mono text-xs leading-6 ${
      isError ? "text-red-400" : isCmd ? "text-emerald-300 font-semibold" : isSuccess ? "text-emerald-400" : isWarn ? "text-yellow-400" : "text-zinc-300"
    }`}>
      {isCmd ? <><span className="text-zinc-600 mr-2 select-none">❯</span>{line.slice(2)}</> : line}
    </div>
  );
};

// ─── StatusBar ────────────────────────────────────────────────────────────────
const StatusBar = ({ activeFile, collabUsers, linesCount, col, isSaving, isConnected }: {
  activeFile: OpenFile | null;
  collabUsers: CollabUser[];
  linesCount: number;
  col: number;
  isSaving: boolean;
  isConnected: boolean;
}) => (
  <div className="flex items-center justify-between bg-blue-600 px-3 py-0.5 text-[11px] font-medium text-blue-50 select-none shrink-0">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <GitBranch className="w-3 h-3" />
        <span>main</span>
      </div>
      {isSaving && (
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Saving…</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <Circle className={`w-2.5 h-2.5 fill-current ${isConnected ? "text-emerald-300" : "text-yellow-400"}`} />
        <span>{isConnected ? `${collabUsers.length + 1} online` : "Connecting…"}</span>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {activeFile && (
        <>
          <span>{activeFile.language}</span>
          <span>UTF-8</span>
          <span>Ln {linesCount}, Col {col}</span>
        </>
      )}
      <span>Spaces: 2</span>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function CodeEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeFileId = searchParams.get("fileId");

  // State
  const [cloudFiles, setCloudFiles] = useState<CloudEntry[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [localRootHandle, setLocalRootHandle] = useState<any>(null);
  const [localRootName, setLocalRootName] = useState("");
  const [localNodes, setLocalNodes] = useState<WorkspaceNode[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<"local" | "cloud">("cloud");
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [code, setCode] = useState("// ✨ Welcome to HackCollab Code Editor\n// Open a file from the explorer or create a new one to start coding.\n\n");
  const [showExplorer, setShowExplorer] = useState(true);
  const [showAssistant, setShowAssistant] = useState(true);
  const [sidebarView, setSidebarView] = useState<"explorer" | "github">("explorer");
  const [showOutput, setShowOutput] = useState(false);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMode, setAssistantMode] = useState<AssistantMode>("implement");
  const [assistantScope, setAssistantScope] = useState<AssistantScope>("entire-project");
  const [assistantProvider, setAssistantProvider] = useState<AssistantProvider>("chatgpt");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    { role: "assistant", content: "👋 HackCollab AI is ready. I can inspect the full workspace, edit multiple files, and work across the entire project.", timestamp: new Date() },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [assistantStatus, setAssistantStatus] = useState("Ready for workspace-wide coding tasks.");
  const [assistantPanelWidth, setAssistantPanelWidth] = useState(420);
  const [isResizingAssistant, setIsResizingAssistant] = useState(false);
  const [collabUsers] = useState<CollabUser[]>(MOCK_COLLAB_USERS);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [isConnected] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [editorZoom, setEditorZoom] = useState(14);

  const editorWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const assistantEndRef = useRef<HTMLDivElement | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);

  // Derived
  const activeFile = useMemo(() => openTabs.find((t) => t.id === activeTabId) || null, [openTabs, activeTabId]);
  const cloudTree = useMemo(() => buildCloudTree(cloudFiles), [cloudFiles]);
  const explorerNodes = workspaceMode === "local" ? localNodes : cloudTree;
  const filteredExplorerNodes = useMemo(() => filterWorkspaceNodes(explorerNodes, explorerSearch), [explorerNodes, explorerSearch]);
  const selectedNode = useMemo(() => findNodeByPath(explorerNodes, selectedPath), [explorerNodes, selectedPath]);
  const selectedProviderProfile = assistantProviderProfiles[assistantProvider];

  // Scroll assistant to bottom
  useEffect(() => { assistantEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [assistantMessages, isGenerating]);

  useEffect(() => {
    const target = assistantScope === "current-file" ? activeFile?.name || "No file" : assistantScope === "open-tabs" ? `${openTabs.length} open tabs` : workspaceMode === "local" ? localRootName || "Local workspace" : "Cloud workspace";
    setAssistantStatus(`${selectedProviderProfile.label} active — Scope: ${target}`);
  }, [assistantProvider, assistantScope, activeFile?.name, localRootName, openTabs.length, selectedProviderProfile.label, workspaceMode]);

  // Persist assistant panel width
  useEffect(() => {
    const saved = window.localStorage.getItem("hackcollab-assistant-panel-width");
    if (saved) { const n = Number(saved); if (Number.isFinite(n) && n >= 280) setAssistantPanelWidth(n); }
  }, []);
  useEffect(() => { window.localStorage.setItem("hackcollab-assistant-panel-width", String(assistantPanelWidth)); }, [assistantPanelWidth]);

  // Resize handler
  useEffect(() => {
    if (!isResizingAssistant) return;
    const onMove = (e: MouseEvent) => {
      const container = editorWorkspaceRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const next = Math.min(820, Math.max(300, bounds.right - e.clientX));
      setAssistantPanelWidth(next);
    };
    const onUp = () => setIsResizingAssistant(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingAssistant]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveCurrentFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") { e.preventDefault(); setShowOutput((p) => !p); }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); setShowExplorer((p) => !p); }
      if ((e.ctrlKey || e.metaKey) && e.key === "j") { e.preventDefault(); setShowAssistant((p) => !p); }
      if (e.key === "F5") { e.preventDefault(); runCurrentFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "=") { e.preventDefault(); setEditorZoom((z) => Math.min(z + 2, 24)); }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setEditorZoom((z) => Math.max(z - 2, 10)); }
      if (e.key === "Escape" && showShortcuts) setShowShortcuts(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showShortcuts]);

  // Firestore listeners
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "files"), orderBy("updatedAt", "desc")), (snap) => {
      setCloudFiles(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CloudEntry, "id">) })));
    });
    const unsubReviews = onSnapshot(query(collection(db, "reviewRequests"), orderBy("requestedAt", "desc")), (snap) => {
      setReviewRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewRequest, "id">) })));
    });
    return () => { unsub(); unsubReviews(); };
  }, []);

  useEffect(() => {
    if (!routeFileId || cloudFiles.length === 0) return;
    const target = cloudFiles.find((e) => e.id === routeFileId);
    if (target) { openCloudFile(target); setShowExplorer(true); setSidebarView("explorer"); }
  }, [routeFileId, cloudFiles]);

  useEffect(() => {
    if (activeFile) { setCode(activeFile.content); setSelectedPath(activeFile.path); }
  }, [activeTabId]);

  // ── Workspace helpers ─────────────────────────────────────────────────────
  const readLocalDirectory = async (handle: any, parentPath = ""): Promise<WorkspaceNode[]> => {
    const nodes: WorkspaceNode[] = [];
    for await (const [name, childHandle] of handle.entries()) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      if (childHandle.kind === "directory") {
        nodes.push({ id: `local-dir-${path}`, name, path, kind: "directory", source: "local", handle: childHandle, children: await readLocalDirectory(childHandle, path) });
      } else {
        nodes.push({ id: `local-file-${path}`, name, path, kind: "file", source: "local", handle: childHandle });
      }
    }
    return sortNodes(nodes);
  };

  const refreshLocalWorkspace = async (handle = localRootHandle) => {
    if (!handle) return;
    setLocalNodes(await readLocalDirectory(handle));
  };

  const openLocalWorkspace = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) { alert("Your browser does not support local workspace access. Use Chrome or Edge."); return; }
    const handle = await picker();
    setLocalRootHandle(handle); setLocalRootName(handle.name);
    setWorkspaceMode("local"); setShowExplorer(true); setSidebarView("explorer");
    setLocalNodes(await readLocalDirectory(handle));
  };

  const upsertTab = (next: OpenFile) => {
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.id === next.id);
      if (existing) return prev.map((t) => (t.id === next.id ? next : t));
      return [...prev, next];
    });
    setActiveTabId(next.id);
  };

  const openCloudFile = (entry: CloudEntry) => {
    const folder = entry.folderId ? cloudFiles.find((c) => c.id === entry.folderId && c.type === "folder") : null;
    upsertTab({
      id: `cloud-${entry.id}`, name: entry.name,
      path: folder ? `${folder.name}/${entry.name}` : entry.name,
      language: detectLanguage(entry.name), content: entry.content || "",
      source: "cloud", fileId: entry.id,
    });
    setWorkspaceMode("cloud");
  };

  const getCloudEntryPath = (entry: CloudEntry) => {
    if (!entry.folderId) return entry.name;
    const folder = cloudFiles.find((c) => c.id === entry.folderId && c.type === "folder");
    return folder ? `${folder.name}/${entry.name}` : entry.name;
  };

  const resolveCloudEntryByPath = (path: string) => {
    const normalized = path.replace(/^\.\/+/, "");
    const exact = cloudFiles.find((e) => e.type !== "folder" && getCloudEntryPath(e) === normalized);
    if (exact) return exact;
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length === 1) return cloudFiles.find((e) => e.type !== "folder" && e.name === parts[0]) || null;
    const folder = cloudFiles.find((e) => e.type === "folder" && e.name === parts[0]);
    if (!folder) return null;
    return cloudFiles.find((e) => e.type !== "folder" && e.folderId === folder.id && e.name === parts.slice(1).join("/")) || null;
  };

  const writeLocalFileByPath = async (path: string, content: string) => {
    if (!localRootHandle) throw new Error("Open a local workspace first.");
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    let dir = localRootHandle;
    for (const seg of parts) dir = await dir.getDirectoryHandle(seg, { create: true });
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(content); await w.close();
    return fh;
  };

  const buildAssistantContext = async () => {
    const treeSummary = summarizeNodes(explorerNodes).join("\n") || "- workspace is empty";
    const openTabsSummary = openTabs.map((t) => `### ${t.path}\n\n\`\`\`${t.language}\n${t.content.slice(0, 5000)}\n\`\`\``).join("\n\n");
    let sampleFiles = "";
    if (assistantScope === "current-file" && activeFile) {
      sampleFiles = `### ${activeFile.path}\n\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 5000)}\n\`\`\``;
    } else if (assistantScope === "open-tabs") {
      sampleFiles = openTabsSummary || "- no open tabs";
    } else if (workspaceMode === "local" && localRootHandle) {
      const sampleNodes = flattenNodes(explorerNodes).filter((n) => n.kind === "file" && n.handle && isTextFile(n.name)).slice(0, 6);
      const snippets: string[] = [];
      for (const n of sampleNodes) {
        try { const f = await n.handle.getFile(); snippets.push(`### ${n.path}\n\n\`\`\`${detectLanguage(n.name)}\n${(await f.text()).slice(0, 5000)}\n\`\`\``); }
        catch { snippets.push(`### ${n.path}\n\n- unable to read`); }
      }
      sampleFiles = snippets.join("\n\n") || "- no text files";
    } else {
      sampleFiles = cloudFiles.filter((e) => e.type !== "folder").slice(0, 6).map((e) => `### ${getCloudEntryPath(e)}\n\n\`\`\`${detectLanguage(e.name)}\n${(e.content || "").slice(0, 5000)}\n\`\`\``).join("\n\n") || "- no cloud files";
    }
    return { treeSummary, openTabsSummary, sampleFiles };
  };

  const applyAssistantChange = async (change: AssistantChange) => {
    const normalized = change.path.replace(/^\.\/+/, "").trim();
    if (!normalized) return null;
    if (workspaceMode === "local") {
      const fh = await writeLocalFileByPath(normalized, change.content);
      await refreshLocalWorkspace(localRootHandle);
      if (activeFile?.path === normalized) setCode(change.content);
      setOpenTabs((prev) => prev.map((t) => (t.path === normalized ? { ...t, content: change.content } : t)));
      return { path: normalized, handle: fh };
    }
    const existing = resolveCloudEntryByPath(normalized);
    if (existing) {
      await updateDoc(doc(db, "files", existing.id), { content: change.content, updatedAt: serverTimestamp(), size: Math.max(1, Math.round(new Blob([change.content]).size / 1024)) });
      if (activeFile?.path === normalized) setCode(change.content);
      setOpenTabs((prev) => prev.map((t) => (t.path === normalized ? { ...t, content: change.content } : t)));
      return { path: normalized, id: existing.id };
    }
    const parts = normalized.split("/").filter(Boolean);
    const fileName = parts.pop() || normalized;
    const folderName = parts[0] || "";
    const parentFolder = folderName ? cloudFiles.find((e) => e.type === "folder" && e.name === folderName) : null;
    const ref = await addDoc(collection(db, "files"), { name: fileName, type: detectLanguage(fileName), content: change.content, size: Math.max(1, Math.round(new Blob([change.content]).size / 1024)), folderId: parentFolder?.id || null, updatedAt: serverTimestamp(), lockedBy: null });
    if (activeFile?.path === normalized) setCode(change.content);
    setOpenTabs((prev) => prev.map((t) => (t.path === normalized ? { ...t, content: change.content } : t)));
    return { path: normalized, id: ref.id };
  };

  const openLocalFile = async (node: WorkspaceNode) => {
    if (!node.handle) return;
    const f = await node.handle.getFile();
    upsertTab({ id: node.id, name: node.name, path: node.path, language: detectLanguage(node.name), content: await f.text(), source: "local", handle: node.handle });
    setWorkspaceMode("local");
  };

  const handleExplorerOpen = (node: WorkspaceNode) => {
    if (node.kind === "directory") { setSelectedPath(node.path); return; }
    if (node.source === "local") { openLocalFile(node).catch(console.error); return; }
    const target = cloudFiles.find((e) => e.id === node.fileId);
    if (target) openCloudFile(target);
  };

  const updateActiveContent = (nextCode: string) => {
    setCode(nextCode);
    setOpenTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, content: nextCode, isDirty: true } : t)));
  };

  const saveCurrentFile = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      if (activeFile.source === "local" && activeFile.handle) {
        const w = await activeFile.handle.createWritable();
        await w.write(code); await w.close();
      }
      if (activeFile.source === "cloud" && activeFile.fileId) {
        await updateDoc(doc(db, "files", activeFile.fileId), { content: code, updatedAt: serverTimestamp(), size: Math.max(1, Math.round(new Blob([code]).size / 1024)) });
      }
      setOpenTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)));
    } finally { setIsSaving(false); }
  };

  const closeTab = (tabId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) setActiveTabId(next[0]?.id || "");
      return next;
    });
  };

  const createInLocalWorkspace = async (kind: "file" | "folder") => {
    const parentNode = selectedNode?.kind === "directory" ? selectedNode : selectedPath ? findNodeByPath(explorerNodes, getParentPath(selectedPath)) : null;
    const name = window.prompt(kind === "file" ? "Enter file name:" : "Enter folder name:", kind === "file" ? "new-file.ts" : "new-folder");
    if (!name) return;
    if (workspaceMode === "local") {
      if (!localRootHandle) { await openLocalWorkspace(); return; }
      const targetDir = parentNode?.source === "local" && parentNode.kind === "directory" && parentNode.handle ? parentNode.handle : localRootHandle;
      if (kind === "folder") { await targetDir.getDirectoryHandle(name, { create: true }); await refreshLocalWorkspace(localRootHandle); return; }
      const fh = await targetDir.getFileHandle(name, { create: true });
      const w = await fh.createWritable(); await w.write("// Start building here\n"); await w.close();
      await refreshLocalWorkspace(localRootHandle);
      const basePath = parentNode?.source === "local" && parentNode.kind === "directory" ? `${parentNode.path}/${name}` : name;
      await openLocalFile({ id: `local-file-${basePath}`, name, path: basePath, kind: "file", source: "local", handle: fh });
      setSelectedPath(basePath);
      return;
    }
    const folderId = parentNode?.source === "cloud" && parentNode.kind === "directory" ? parentNode.fileId || null : null;
    if (kind === "folder") { await addDoc(collection(db, "files"), { name, type: "folder", content: "", size: 0, folderId, updatedAt: serverTimestamp(), lockedBy: null }); return; }
    const ref = await addDoc(collection(db, "files"), { name, type: detectLanguage(name), content: "// Start building here\n", size: 1, folderId, updatedAt: serverTimestamp(), lockedBy: null });
    const nextPath = parentNode?.source === "cloud" && parentNode.kind === "directory" ? `${parentNode.path}/${name}` : name;
    upsertTab({ id: `cloud-${ref.id}`, name, path: nextPath, language: detectLanguage(name), content: "// Start building here\n", source: "cloud", fileId: ref.id });
    setSelectedPath(nextPath); setShowExplorer(true); setSidebarView("explorer");
  };

  const runCurrentFile = async () => {
    if (!activeFile) return;
    setShowOutput(true); setIsRunning(true);
    setOutputLines([`$ run ${activeFile.name}`, `Running ${activeFile.name}…`]);
    if (!["javascript", "typescript"].includes(activeFile.language)) {
      setOutputLines((p) => [...p, `⚠ Preview execution is available for JavaScript/TypeScript only.`]);
      setIsRunning(false); return;
    }
    const logs: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...args) => { logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")); origLog(...args); };
    console.error = (...args) => { logs.push(`Error: ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`); origErr(...args); };
    try {
      const fn = new (Object.getPrototypeOf(async function () {}).constructor)(code);
      const result = await fn();
      if (result !== undefined) logs.push(String(result));
      if (logs.length === 0) logs.push("✓ Execution completed with no output.");
      setOutputLines((p) => [...p, ...logs]);
    } catch (err: any) {
      setOutputLines((p) => [...p, `Error: ${err.message}`]);
    } finally {
      console.log = origLog; console.error = origErr; setIsRunning(false);
    }
  };

  const shareCurrent = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.path);
    setIsCopied(true); setTimeout(() => setIsCopied(false), 1800);
  };

  const clearAssistantSession = () => {
    setAssistantMessages([{ role: "assistant", content: "Session cleared. Ready for the next task.", timestamp: new Date() }]);
    setAssistantInput("");
  };

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim() || isGenerating) return;
    if (assistantScope === "current-file" && !activeFile) {
      setAssistantMessages((p) => [...p, { role: "assistant", content: "Open a file first, or switch scope to open tabs or entire project.", timestamp: new Date() }]);
      return;
    }
    const userPrompt = assistantInput.trim();
    setAssistantMessages((p) => [...p, { role: "user", content: userPrompt, timestamp: new Date() }]);
    setAssistantInput(""); setIsGenerating(true);
    setAssistantStatus(`${selectedProviderProfile.label} is inspecting the workspace…`);
    try {
      const context = await buildAssistantContext();
      const modeDesc: Record<AssistantMode, string> = {
        implement: "Implement the requested feature with production-ready code.",
        refactor: "Refactor the relevant files for clarity and maintainability.",
        debug: "Find and fix the bug with the smallest safe change.",
        explain: "Explain the relevant code and only edit if necessary.",
      };
      const scopeDesc: Record<AssistantScope, string> = {
        "current-file": "Current file only.",
        "open-tabs": "All open tabs and their current content.",
        "entire-project": "The full loaded project tree and sampled file contents.",
      };
      const res = await fetch("/api/editor/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: assistantProvider, providerLabel: selectedProviderProfile.label,
          providerOperatingStyle: selectedProviderProfile.operatingStyle,
          mode: assistantMode, modeGuidance: modeDesc[assistantMode],
          scope: assistantScope, scopeGuidance: scopeDesc[assistantScope],
          workspaceMode, workspaceRoot: workspaceMode === "local" ? localRootName || "Local Workspace" : "Cloud Workspace",
          githubConnected: auth.currentUser?.providerData.some((p) => p.providerId === "github.com") || false,
          treeSummary: context.treeSummary, openTabsSummary: context.openTabsSummary || "- none",
          sampleFiles: context.sampleFiles, userPrompt,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Assistant request failed.");
      const parsed = payload as { message?: string; changes?: AssistantChange[]; engine?: string; model?: string; fallbackUsed?: boolean };
      const appliedPaths: string[] = [];
      for (const change of parsed.changes || []) {
        const applied = await applyAssistantChange(change);
        if (applied?.path) appliedPaths.push(applied.path);
      }
      const engineLabel = parsed.engine ? `${selectedProviderProfile.label} via ${parsed.engine}${parsed.model ? ` (${parsed.model})` : ""}` : selectedProviderProfile.label;
      const summary = [parsed.message || "Project changes applied."];
      if (parsed.fallbackUsed) summary.push(`Requested ${selectedProviderProfile.label}, used ${parsed.engine || "configured"} engine instead.`);
      if (appliedPaths.length > 0) summary.push(`✓ Applied ${appliedPaths.length} file${appliedPaths.length === 1 ? "" : "s"}: ${appliedPaths.join(", ")}`);
      setAssistantMessages((p) => [...p, { role: "assistant", content: `[${engineLabel}]\n\n${summary.join("\n\n")}`, timestamp: new Date() }]);
      setAssistantStatus(appliedPaths.length > 0 ? `${engineLabel} applied ${appliedPaths.length} change${appliedPaths.length === 1 ? "" : "s"}.` : `${engineLabel} finished — no file edits.`);
    } catch (err: any) {
      setAssistantMessages((p) => [...p, { role: "assistant", content: `⚠ Error: ${err.message}`, timestamp: new Date() }]);
      setAssistantStatus(`${selectedProviderProfile.label} hit an error.`);
    } finally { setIsGenerating(false); }
  };

  const pushForReview = async () => {
    if (!activeFile || !auth.currentUser || activeFile.source !== "cloud" || !activeFile.fileId) return;
    setIsPushing(true);
    try {
      await createReviewRequest(auth.currentUser, activeFile.fileId, activeFile.name);
      await logActivity(auth.currentUser, { type: "review_submitted", title: "Changes pushed for review", detail: `${auth.currentUser.displayName || auth.currentUser.email} submitted ${activeFile.name} for review.`, metadata: { fileId: activeFile.fileId, fileName: activeFile.name } });
    } finally { setIsPushing(false); }
  };

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorLine(e.position.lineNumber);
      setCursorCol(e.position.column);
    });
    // Custom theme
    monaco.editor.defineTheme("hackcollab-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a737d", fontStyle: "italic" },
        { token: "keyword", foreground: "f97583" },
        { token: "string", foreground: "9ecbff" },
        { token: "number", foreground: "79b8ff" },
        { token: "type", foreground: "b392f0" },
        { token: "function", foreground: "e1c08f" },
        { token: "variable", foreground: "e1e4e8" },
        { token: "operator", foreground: "f97583" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#e1e4e8",
        "editor.lineHighlightBackground": "#161b22",
        "editor.selectionBackground": "#264f78aa",
        "editorCursor.foreground": "#58a6ff",
        "editorLineNumber.foreground": "#484f58",
        "editorLineNumber.activeForeground": "#8b949e",
        "editor.inactiveSelectionBackground": "#264f7860",
        "editorIndentGuide.background": "#21262d",
        "editorIndentGuide.activeBackground": "#30363d",
        "scrollbarSlider.background": "#30363d80",
        "scrollbarSlider.hoverBackground": "#484f5880",
      },
    });
    monaco.editor.setTheme("hackcollab-dark");
    // Add collab user decorations
    const decorations: any[] = collabUsers.map((u) => ({
      range: new monaco.Range(u.line, u.col, u.line, u.col + 1),
      options: {
        className: "",
        inlineClassName: "",
        afterContentClassName: "",
        beforeContentClassName: `collab-cursor-${u.id}`,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }));
    editor.createDecorationsCollection(decorations);
  };

  const linesCount = code.split("\n").length;

  // ─── Keyboard shortcuts modal ───────────────────────────────────────────────
  const shortcuts = [
    { keys: ["Ctrl", "S"], desc: "Save current file" },
    { keys: ["Ctrl", "`"], desc: "Toggle terminal" },
    { keys: ["Ctrl", "B"], desc: "Toggle explorer sidebar" },
    { keys: ["Ctrl", "J"], desc: "Toggle AI assistant" },
    { keys: ["F5"], desc: "Run current file" },
    { keys: ["Ctrl", "+"], desc: "Zoom in editor" },
    { keys: ["Ctrl", "-"], desc: "Zoom out editor" },
    { keys: ["Esc"], desc: "Close dialog" },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col gap-0 relative">
      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-[400px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2"><Keyboard className="w-4 h-4" /> Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-zinc-300">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="px-2 py-0.5 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-200">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-zinc-950 border-b border-zinc-800/60 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">Code Editor</p>
              <p className="text-[10px] text-zinc-500 leading-none mt-0.5">HackCollab Workspace</p>
            </div>
          </div>

          <div className="h-5 w-px bg-zinc-800 mx-1" />

          {/* Toolbar buttons */}
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowExplorer((p) => !p); if (!showExplorer) setSidebarView("explorer"); }}
              title="Toggle Sidebar (Ctrl+B)"
              className={`p-1.5 rounded-lg transition-all text-sm ${showExplorer ? "bg-blue-500/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              {showExplorer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <button onClick={() => { setShowExplorer(true); setSidebarView("explorer"); }}
              className={`p-1.5 rounded-lg transition-all ${showExplorer && sidebarView === "explorer" ? "bg-blue-500/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              <Files className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowExplorer(true); setSidebarView("github"); }}
              className={`p-1.5 rounded-lg transition-all ${showExplorer && sidebarView === "github" ? "bg-blue-500/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              <Github className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAssistant((p) => !p)} title="Toggle AI (Ctrl+J)"
              className={`p-1.5 rounded-lg transition-all ${showAssistant ? "bg-purple-500/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              <Bot className="w-4 h-4" />
            </button>
            <button onClick={() => setShowOutput((p) => !p)} title="Toggle Terminal (Ctrl+`)"
              className={`p-1.5 rounded-lg transition-all ${showOutput ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
              <TerminalSquare className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            <button onClick={openLocalWorkspace} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
              <FolderOpen className="w-3.5 h-3.5" /> Open Workspace
            </button>
            <button onClick={saveCurrentFile} disabled={!activeFile || isSaving}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button onClick={runCurrentFile} disabled={!activeFile || isRunning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isRunning ? "Running…" : "Run"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-1">
            <button onClick={() => setEditorZoom((z) => Math.max(z - 2, 10))} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"><Minus className="w-3 h-3" /></button>
            <span className="text-xs font-mono text-zinc-400 w-8 text-center">{editorZoom}px</span>
            <button onClick={() => setEditorZoom((z) => Math.min(z + 2, 24))} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"><Plus className="w-3 h-3" /></button>
          </div>

          {/* Collab avatars */}
          <CollabAvatars users={collabUsers} />

          <button onClick={() => setShowShortcuts(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all" title="Keyboard shortcuts">
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main IDE layout ──────────────────────────────────────────────────── */}
      <div ref={editorWorkspaceRef} className="flex min-h-0 flex-1 overflow-hidden bg-[#0d1117]">

        {/* Activity bar */}
        <div className="flex w-12 flex-col items-center gap-2 border-r border-zinc-800/60 bg-[#010409] py-3 shrink-0">
          <button onClick={() => { setShowExplorer(true); setSidebarView("explorer"); }}
            title="Explorer" className={`p-2 rounded-xl transition-all ${showExplorer && sidebarView === "explorer" ? "bg-blue-500/20 text-blue-400" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"}`}>
            <Files className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowExplorer(true); setSidebarView("github"); }}
            title="Source Control" className={`p-2 rounded-xl transition-all ${showExplorer && sidebarView === "github" ? "bg-blue-500/20 text-blue-400" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"}`}>
            <GitBranch className="w-5 h-5" />
          </button>
          <button onClick={() => setShowAssistant((p) => !p)}
            title="AI Assistant" className={`p-2 rounded-xl transition-all ${showAssistant ? "bg-purple-500/20 text-purple-400" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50"}`}>
            <Sparkles className="w-5 h-5" />
          </button>
          <button title="Team" onClick={() => navigate("/workspace")}
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all">
            <Users className="w-5 h-5" />
          </button>
          <div className="mt-auto">
            <button title="Settings" onClick={() => navigate("/profile")}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Explorer Sidebar */}
        {showExplorer && (
          <aside className="flex w-64 flex-col border-r border-zinc-800/60 bg-[#010409] shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/40">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {sidebarView === "github" ? "Source Control" : "Explorer"}
              </span>
              {sidebarView === "explorer" && (
                <div className="flex items-center gap-0.5">
                  <button onClick={() => createInLocalWorkspace("file")} title="New File" className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"><FilePlus2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => createInLocalWorkspace("folder")} title="New Folder" className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"><FolderPlus className="w-3.5 h-3.5" /></button>
                  {workspaceMode === "local" && (
                    <button onClick={() => refreshLocalWorkspace()} title="Refresh" className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"><RefreshCw className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              )}
            </div>

            {sidebarView === "explorer" ? (
              <>
                {/* Workspace badge */}
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/40 border-b border-zinc-800/40">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${workspaceMode === "local" ? "bg-yellow-400" : "bg-blue-400"}`} />
                  <span className="text-xs font-medium text-zinc-400 truncate">
                    {workspaceMode === "local" ? localRootName || "Local Workspace" : "Cloud Workspace"}
                  </span>
                </div>
                {/* Search */}
                <div className="px-2 py-2 border-b border-zinc-800/40">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                    <input type="text" value={explorerSearch} onChange={(e) => setExplorerSearch(e.target.value)}
                      placeholder="Search files…"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                </div>
                {/* File tree */}
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                  {filteredExplorerNodes.length === 0 ? (
                    <div className="mt-4 mx-1 rounded-xl border border-dashed border-zinc-800 p-4 text-center">
                      <FileCode2 className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-600">{workspaceMode === "local" ? "No files in this folder" : "No cloud files yet"}</p>
                    </div>
                  ) : filteredExplorerNodes.map((node) => (
                    <ExplorerNode key={node.id} node={node} activePath={selectedPath} onOpen={handleExplorerOpen} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-xs font-semibold text-zinc-300 mb-3 flex items-center gap-1.5"><GitCommit className="w-3.5 h-3.5" /> Repository status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[["Cloud files", cloudFiles.filter((e) => e.type !== "folder").length],["Open tabs", openTabs.length],["Workspace", workspaceMode],["Reviews", reviewRequests.length]].map(([k, v]) => (
                      <div key={String(k)} className="rounded-lg bg-zinc-800/50 px-2.5 py-2">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{k}</p>
                        <p className="text-sm font-semibold text-zinc-200 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate("/workspace")} className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-medium text-zinc-300 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Open Team Workspace
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-xs font-semibold text-zinc-300 mb-2">Recent files</p>
                  <div className="space-y-1.5">
                    {cloudFiles.filter((e) => e.type !== "folder").slice(0, 5).map((file) => (
                      <button key={file.id} onClick={() => openCloudFile(file)} className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800 transition-colors text-left">
                        <span className="text-xs">{getLanguageIcon(detectLanguage(file.name))}</span>
                        <span className="text-xs text-zinc-300 truncate">{file.name}</span>
                      </button>
                    ))}
                    {cloudFiles.length === 0 && <p className="text-xs text-zinc-600 text-center py-2">No cloud files yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ── Editor + Terminal ─────────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-1 flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex items-center bg-[#010409] border-b border-zinc-800/60 overflow-x-auto shrink-0 min-h-[38px]">
            {openTabs.length === 0 ? (
              <span className="px-4 text-xs text-zinc-600 italic">No files open</span>
            ) : openTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const lang = detectLanguage(tab.name);
              return (
                <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 px-4 py-2 text-xs cursor-pointer border-r border-zinc-800/60 shrink-0 transition-all min-w-0 max-w-[180px] relative ${
                    isActive ? "bg-[#0d1117] text-white border-t-2 border-t-blue-500 pt-[6px]" : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 border-t-2 border-t-transparent pt-[6px]"
                  }`}>
                  <span className="text-xs">{getLanguageIcon(lang)}</span>
                  <span className="truncate">{tab.name}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />}
                  <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <div className="flex-1" />
            {activeFile && (
              <div className="flex items-center gap-2 px-3 shrink-0">
                <button onClick={shareCurrent} className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded text-xs">
                  {isCopied ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></> : <><Share2 className="w-3.5 h-3.5" /><span>Share</span></>}
                </button>
                {activeFile.source === "cloud" && auth.currentUser && (
                  <button onClick={pushForReview} disabled={isPushing}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all disabled:opacity-50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isPushing ? "Pushing…" : "Review"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Breadcrumb */}
          {activeFile && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0d1117] border-b border-zinc-800/40 text-xs text-zinc-600 shrink-0">
              {activeFile.path.split("/").map((part, i, arr) => (
                <React.Fragment key={i}>
                  <span className={i === arr.length - 1 ? "text-zinc-300 font-medium" : ""}>{part}</span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                </React.Fragment>
              ))}
              <span className="ml-auto flex items-center gap-1.5">
                <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                  style={{ background: getLanguageColor(activeFile.language) + "20", color: getLanguageColor(activeFile.language), border: `1px solid ${getLanguageColor(activeFile.language)}40` }}>
                  {activeFile.language}
                </span>
                <span>{activeFile.source === "local" ? "🖥 Local" : "☁ Cloud"}</span>
              </span>
            </div>
          )}

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0 relative">
            {!activeFile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4">
                  <Code2 className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-zinc-400 font-semibold text-lg">No file open</p>
                <p className="text-zinc-600 text-sm mt-1 max-w-xs">Select a file from the explorer or create a new one to start coding</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-600">
                  <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40"><kbd className="text-zinc-500">Ctrl+B</kbd> Explorer</div>
                  <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40"><kbd className="text-zinc-500">Ctrl+J</kbd> AI Agent</div>
                  <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40"><kbd className="text-zinc-500">F5</kbd> Run File</div>
                </div>
              </div>
            )}
            <Editor
              height="100%"
              language={activeFile?.language || "plaintext"}
              value={code}
              onChange={(v) => updateActiveContent(v || "")}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: true, scale: 1 },
                fontSize: editorZoom,
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                fontLigatures: true,
                lineHeight: Math.round(editorZoom * 1.7),
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                renderWhitespace: "selection",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                padding: { top: 12, bottom: 12 },
                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                overviewRulerBorder: false,
                roundedSelection: true,
                suggest: { insertMode: "replace" },
                quickSuggestions: { other: true, comments: false, strings: false },
                wordWrap: "off",
                formatOnPaste: true,
                tabSize: 2,
              }}
            />
            {/* Collab ghost cursor overlays (decorative) */}
            <div className="absolute top-2 right-16 flex flex-col gap-1 pointer-events-none z-10">
              {collabUsers.filter((u) => u.isTyping).map((u) => (
                <div key={u.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white shadow-lg"
                  style={{ background: u.color + "cc", backdropFilter: "blur(4px)" }}>
                  <span>{u.name}</span>
                  <TypingDots />
                </div>
              ))}
            </div>
          </div>

          {/* Terminal / Output */}
          {showOutput && (
            <div className="border-t border-zinc-800/60 bg-[#010409] shrink-0" style={{ height: "200px" }}>
              <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-800/40">
                <div className="flex items-center gap-4 text-xs">
                  <button className="flex items-center gap-1.5 text-emerald-400 font-medium border-b-2 border-emerald-500 pb-0.5">
                    <TerminalSquare className="w-3.5 h-3.5" /> Terminal
                  </button>
                  <button className="text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Problems
                  </button>
                  <button className="text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Output
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setOutputLines([])} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded" title="Clear terminal">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowOutput(false)} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-[calc(100%-34px)] overflow-y-auto px-4 py-2 bg-[#010409]">
                {outputLines.length === 0 ? (
                  <div className="text-xs text-zinc-700 font-mono mt-1">
                    <span className="text-emerald-600">❯</span> Terminal is ready. Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-500">F5</kbd> to run the current file.
                  </div>
                ) : outputLines.map((line, i) => (
                  <TerminalLine key={i} line={line} />
                ))}
                {isRunning && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Running…
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── AI Assistant Panel ────────────────────────────────────────────── */}
        {showAssistant && (
          <>
            {/* Resize handle */}
            <div
              onMouseDown={() => setIsResizingAssistant(true)}
              className="group relative w-1 shrink-0 cursor-col-resize bg-zinc-800/60 hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors"
            >
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/5 group-hover:bg-blue-400/40 transition-colors" />
            </div>

            <aside style={{ width: `${assistantPanelWidth}px` }} className="flex flex-col shrink-0 bg-[#010409] border-l border-zinc-800/60 min-h-0">
              {/* Panel header */}
              <div className="border-b border-zinc-800/60 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`rounded-xl border p-2 ${selectedProviderProfile.accent}`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">AI Code Agent</p>
                    <p className="text-[10px] text-zinc-500 truncate">{assistantStatus}</p>
                  </div>
                  <button onClick={() => setShowAssistant(false)} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Provider selector */}
                <div className="grid grid-cols-5 gap-1 bg-zinc-900 rounded-xl p-1 mb-3">
                  {(Object.keys(assistantProviderProfiles) as AssistantProvider[]).map((p) => (
                    <button key={p} onClick={() => setAssistantProvider(p)}
                      className={`relative rounded-lg py-1.5 text-[10px] font-semibold transition-all ${
                        assistantProvider === p ? assistantProviderProfiles[p].accent + " shadow-sm" : "text-zinc-600 hover:text-zinc-400"
                      }`}
                      title={assistantProviderProfiles[p].summary}>
                      <span className={`block w-1.5 h-1.5 rounded-full mx-auto mb-0.5 ${assistantProviderProfiles[p].dot}`} />
                      {assistantProviderProfiles[p].label.slice(0, 3)}
                    </button>
                  ))}
                </div>

                {/* Mode + Scope */}
                <div className="flex gap-2">
                  <div className="flex gap-1 flex-1">
                    {(["implement", "refactor", "debug", "explain"] as AssistantMode[]).map((m) => (
                      <button key={m} onClick={() => setAssistantMode(m)}
                        className={`flex-1 rounded-lg py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                          assistantMode === m ? "bg-white text-black" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                        }`}>{m.slice(0, 3)}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {(["current-file", "open-tabs", "entire-project"] as AssistantScope[]).map((s) => (
                    <button key={s} onClick={() => setAssistantScope(s)}
                      className={`flex-1 rounded-lg py-1 text-[10px] font-medium transition-all ${
                        assistantScope === s ? "bg-blue-500 text-white" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
                      }`}>{s === "current-file" ? "File" : s === "open-tabs" ? "Tabs" : "Project"}</button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-1.5 px-3 pt-3 shrink-0">
                {[
                  { icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, label: "Quick fix", prompt: `Fix the most obvious issue in ${activeFile?.name || "this project"}.`, mode: "debug" as AssistantMode },
                  { icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />, label: "Improve", prompt: `Improve and refactor ${activeFile?.name || "this project"} for clarity.`, mode: "refactor" as AssistantMode },
                  { icon: <Eye className="w-3.5 h-3.5 text-blue-400" />, label: "Explain", prompt: `Explain how ${activeFile?.name || "this project"} works.`, mode: "explain" as AssistantMode },
                  { icon: <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />, label: "Reset", action: clearAssistantSession },
                ].map((item, i) => (
                  <button key={i}
                    onClick={() => {
                      if (item.action) { item.action(); return; }
                      if (item.prompt && item.mode) { setAssistantMode(item.mode); setAssistantInput(item.prompt); }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all text-xs text-zinc-300">
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {assistantMessages.map((msg, i) => (
                  <div key={i} className={`rounded-xl p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600/20 border border-blue-500/30 text-blue-50 ml-4"
                      : "bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 mr-4"
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {msg.role === "user" ? "You" : "AI Agent"}
                      </span>
                      {msg.timestamp && <span className="text-[10px] text-zinc-700">{formatTime(msg.timestamp)}</span>}
                    </div>
                    <div className="whitespace-pre-wrap leading-6 text-xs">{msg.content}</div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 mr-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI Agent</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${selectedProviderProfile.accent}`}>{selectedProviderProfile.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <TypingDots />
                      <span>Generating code edits…</span>
                    </div>
                  </div>
                )}
                <div ref={assistantEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleAssistantSubmit} className="border-t border-zinc-800/60 p-3 shrink-0">
                <div className="relative">
                  <textarea
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAssistantSubmit(e as any); } }}
                    disabled={isGenerating}
                    rows={3}
                    placeholder={`Ask ${selectedProviderProfile.label} to implement, fix, or explain…\n(Enter to send, Shift+Enter for newline)`}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 pr-10 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none disabled:opacity-50 transition-colors"
                  />
                  <button type="submit"
                    disabled={!assistantInput.trim() || isGenerating || (assistantScope === "current-file" && !activeFile)}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shadow-lg shadow-blue-500/20">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </aside>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        activeFile={activeFile}
        collabUsers={collabUsers}
        linesCount={linesCount}
        col={cursorCol}
        isSaving={isSaving}
        isConnected={isConnected}
      />
    </div>
  );
}
