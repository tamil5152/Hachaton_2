import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Bot,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  FileCode2,
  FilePlus2,
  Files,
  FolderOpen,
  FolderPlus,
  Github,
  GitBranch,
  Eye,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Save,
  Search,
  Send,
  Share2,
  Sparkles,
  TerminalSquare,
  X,
  Wand2,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { logActivity } from "../lib/activity";
import { createReviewRequest } from "../lib/workspace";

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
};

type AssistantMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantMode = "implement" | "refactor" | "debug" | "explain";

type AssistantScope = "current-file" | "open-tabs" | "entire-project";

type AssistantProvider = "claude" | "chatgpt" | "gemini" | "deepseek" | "cursor";

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

const assistantProviderProfiles: Record<
  AssistantProvider,
  {
    label: string;
    accent: string;
    summary: string;
    operatingStyle: string;
  }
> = {
  claude: {
    label: "Claude",
    accent: "border-orange-400/30 bg-orange-500/10 text-orange-100",
    summary: "Thoughtful planner with strong structured reasoning.",
    operatingStyle: "Think deeply, explain tradeoffs clearly, and propose carefully staged multi-file edits before applying them.",
  },
  chatgpt: {
    label: "ChatGPT",
    accent: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    summary: "Balanced implementation copilot for fast coding loops.",
    operatingStyle: "Be practical, fast, and code-forward. Prefer direct implementation with concise explanation and safe changes.",
  },
  gemini: {
    label: "Gemini",
    accent: "border-blue-400/30 bg-blue-500/10 text-blue-100",
    summary: "Workspace-wide editor agent with strong synthesis.",
    operatingStyle: "Use broad project context, connect distant files when needed, and optimize for implementation plus context-aware summaries.",
  },
  deepseek: {
    label: "DeepSeek",
    accent: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    summary: "Debug-first reasoning profile for code repair.",
    operatingStyle: "Bias toward root-cause analysis, isolate the bug precisely, and keep fixes minimal but correct.",
  },
  cursor: {
    label: "Cursor",
    accent: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
    summary: "Inline coding copilot focused on edit momentum.",
    operatingStyle: "Act like an aggressive editor copilot: inspect, patch, and keep users moving with multi-file implementation suggestions.",
  },
};

const detectLanguage = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    py: "python",
    md: "markdown",
    java: "java",
    sh: "shell",
    ps1: "powershell",
  };
  return ext ? map[ext] || "plaintext" : "plaintext";
};

const sortNodes = (nodes: WorkspaceNode[]) =>
  [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

const buildCloudTree = (entries: CloudEntry[]) => {
  const folders = new Map<string, WorkspaceNode>();
  const roots: WorkspaceNode[] = [];

  entries
    .filter((entry) => entry.type === "folder")
    .forEach((folder) => {
      folders.set(folder.id, {
        id: `cloud-folder-${folder.id}`,
        name: folder.name,
        path: folder.name,
        kind: "directory",
        source: "cloud",
        children: [],
      });
    });

  entries
    .filter((entry) => entry.type !== "folder")
    .forEach((file) => {
      const node: WorkspaceNode = {
        id: `cloud-file-${file.id}`,
        name: file.name,
        path: file.folderId && folders.has(file.folderId) ? `${folders.get(file.folderId)?.name}/${file.name}` : file.name,
        kind: "file",
        source: "cloud",
        fileId: file.id,
      };

      if (file.folderId && folders.has(file.folderId)) {
        folders.get(file.folderId)?.children?.push(node);
      } else {
        roots.push(node);
      }
    });

  folders.forEach((folder) => {
    folder.children = sortNodes(folder.children || []);
    roots.push(folder);
  });

  return sortNodes(roots);
};

const summarizeNodes = (nodes: WorkspaceNode[], depth = 0): string[] => {
  const lines: string[] = [];
  nodes.forEach((node) => {
    lines.push(`${"  ".repeat(depth)}- ${node.name}${node.kind === "directory" ? "/" : ""}`);
    if (node.children?.length) {
      lines.push(...summarizeNodes(node.children, depth + 1));
    }
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
  nodes.forEach((node) => {
    list.push(node);
    if (node.children?.length) {
      list.push(...flattenNodes(node.children));
    }
  });
  return list;
};

const isTextFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return [
    "js",
    "jsx",
    "ts",
    "tsx",
    "json",
    "html",
    "css",
    "md",
    "txt",
    "yml",
    "yaml",
    "py",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "go",
    "rs",
    "sh",
    "ps1",
    "csv",
    "xml",
    "sql",
    "env",
    "ini",
    "toml",
  ].includes(ext);
};

const getParentPath = (path: string) => {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
};

const filterWorkspaceNodes = (nodes: WorkspaceNode[], search: string): WorkspaceNode[] => {
  const term = search.trim().toLowerCase();
  if (!term) return nodes;

  const visit = (list: WorkspaceNode[]): WorkspaceNode[] => {
    const next: WorkspaceNode[] = [];
    list.forEach((node) => {
      const childMatches = node.children?.length ? visit(node.children) : [];
      const matches = node.name.toLowerCase().includes(term) || node.path.toLowerCase().includes(term);
      if (matches || childMatches.length) {
        next.push({ ...node, children: node.kind === "directory" ? childMatches : node.children });
      }
    });
    return next;
  };

  return visit(nodes);
};

const ExplorerNode = ({
  key,
  node,
  activePath,
  onOpen,
}: {
  key?: React.Key;
  node: WorkspaceNode;
  activePath: string;
  onOpen: (node: WorkspaceNode) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const isActive = activePath === node.path;

  if (node.kind === "file") {
    return (
      <button
        onClick={() => onOpen(node)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          isActive ? "bg-[#094771] text-white" : "text-zinc-300 hover:bg-white/[0.04]"
        }`}
      >
        <FileCode2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.04]"
      >
        <FolderOpen className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && node.children?.length ? (
        <div className="ml-4 space-y-1 border-l border-white/5 pl-2">
          {node.children.map((child) => (
            <ExplorerNode key={child.id} node={child} activePath={activePath} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default function CodeEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeFileId = searchParams.get("fileId");

  const [cloudFiles, setCloudFiles] = useState<CloudEntry[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [localRootHandle, setLocalRootHandle] = useState<any>(null);
  const [localRootName, setLocalRootName] = useState("");
  const [localNodes, setLocalNodes] = useState<WorkspaceNode[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<"local" | "cloud">("cloud");
  const [openTabs, setOpenTabs] = useState<OpenFile[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [code, setCode] = useState("// Open a local workspace or choose a cloud file to begin.\n");
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
    { role: "assistant", content: "Project agent ready. It can inspect the loaded tree, update multiple files, and work across the whole workspace." },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [assistantStatus, setAssistantStatus] = useState("Ready for workspace-wide coding tasks.");
  const [assistantPanelWidth, setAssistantPanelWidth] = useState(440);
  const [isResizingAssistant, setIsResizingAssistant] = useState(false);
  const editorWorkspaceRef = React.useRef<HTMLDivElement | null>(null);

  const activeFile = useMemo(() => openTabs.find((tab) => tab.id === activeTabId) || null, [openTabs, activeTabId]);
  const cloudTree = useMemo(() => buildCloudTree(cloudFiles), [cloudFiles]);
  const explorerNodes = workspaceMode === "local" ? localNodes : cloudTree;
  const filteredExplorerNodes = useMemo(() => filterWorkspaceNodes(explorerNodes, explorerSearch), [explorerNodes, explorerSearch]);
  const selectedNode = useMemo(() => findNodeByPath(explorerNodes, selectedPath), [explorerNodes, selectedPath]);
  const pendingReviewRequests = useMemo(() => reviewRequests.filter((request) => request.status === "pending"), [reviewRequests]);
  const selectedProviderProfile = assistantProviderProfiles[assistantProvider];

  useEffect(() => {
    const target = assistantScope === "current-file" ? activeFile?.name || "No file selected" : assistantScope === "open-tabs" ? `${openTabs.length} open tabs in focus` : workspaceMode === "local" ? localRootName || "Local workspace" : "Cloud workspace";
    setAssistantStatus(`${selectedProviderProfile.label} agent active. Scope: ${target}.`);
  }, [assistantProvider, assistantScope, activeFile?.name, localRootName, openTabs.length, selectedProviderProfile.label, workspaceMode]);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem("hackcollab-assistant-panel-width");
    if (!savedWidth) return;
    const parsedWidth = Number(savedWidth);
    if (Number.isFinite(parsedWidth) && parsedWidth >= 280) {
      setAssistantPanelWidth(parsedWidth);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hackcollab-assistant-panel-width", String(assistantPanelWidth));
  }, [assistantPanelWidth]);

  useEffect(() => {
    if (!isResizingAssistant) return;

    const handlePointerMove = (event: MouseEvent) => {
      const container = editorWorkspaceRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const maxWidth = Math.min(820, Math.max(320, bounds.width - 360));
      const nextWidth = bounds.right - event.clientX;
      const clampedWidth = Math.min(maxWidth, Math.max(320, nextWidth));
      setAssistantPanelWidth(clampedWidth);
    };

    const stopResizing = () => setIsResizingAssistant(false);

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingAssistant]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "files"), orderBy("updatedAt", "desc")), (snapshot) => {
      setCloudFiles(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<CloudEntry, "id">) })));
    });
    const unsubReviews = onSnapshot(query(collection(db, "reviewRequests"), orderBy("requestedAt", "desc")), (snapshot) => {
      setReviewRequests(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<ReviewRequest, "id">) })));
    });
    return () => {
      unsub();
      unsubReviews();
    };
  }, []);

  useEffect(() => {
    if (!routeFileId || cloudFiles.length === 0) return;
    const target = cloudFiles.find((entry) => entry.id === routeFileId);
    if (target) {
      openCloudFile(target);
      setShowExplorer(true);
      setSidebarView("explorer");
    }
  }, [routeFileId, cloudFiles]);

  useEffect(() => {
    if (activeFile) {
      setCode(activeFile.content);
      setSelectedPath(activeFile.path);
    }
  }, [activeTabId]);

  const readLocalDirectory = async (handle: any, parentPath = "") : Promise<WorkspaceNode[]> => {
    const nodes: WorkspaceNode[] = [];
    for await (const [name, childHandle] of handle.entries()) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      if (childHandle.kind === "directory") {
        nodes.push({
          id: `local-dir-${path}`,
          name,
          path,
          kind: "directory",
          source: "local",
          handle: childHandle,
          children: await readLocalDirectory(childHandle, path),
        });
      } else {
        nodes.push({
          id: `local-file-${path}`,
          name,
          path,
          kind: "file",
          source: "local",
          handle: childHandle,
        });
      }
    }
    return sortNodes(nodes);
  };

  const refreshLocalWorkspace = async (handle = localRootHandle) => {
    if (!handle) return;
    const nodes = await readLocalDirectory(handle);
    setLocalNodes(nodes);
  };

  const openLocalWorkspace = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      alert("Your browser does not support opening a local workspace. Use a Chromium-based browser like Edge or Chrome.");
      return;
    }
    const handle = await picker();
    setLocalRootHandle(handle);
    setLocalRootName(handle.name);
    setWorkspaceMode("local");
    setShowExplorer(true);
    setSidebarView("explorer");
    const nodes = await readLocalDirectory(handle);
    setLocalNodes(nodes);
  };

  const upsertTab = (next: OpenFile) => {
    setOpenTabs((prev) => {
      const existing = prev.find((tab) => tab.id === next.id);
      if (existing) {
        return prev.map((tab) => (tab.id === next.id ? next : tab));
      }
      return [...prev, next];
    });
    setActiveTabId(next.id);
  };

  const openCloudFile = (entry: CloudEntry) => {
    const folder = entry.folderId ? cloudFiles.find((candidate) => candidate.id === entry.folderId && candidate.type === "folder") : null;
    const next: OpenFile = {
      id: `cloud-${entry.id}`,
      name: entry.name,
      path: folder ? `${folder.name}/${entry.name}` : entry.name,
      language: detectLanguage(entry.name),
      content: entry.content || "",
      source: "cloud",
      fileId: entry.id,
    };
    upsertTab(next);
    setWorkspaceMode("cloud");
  };

  const getCloudEntryPath = (entry: CloudEntry) => {
    if (!entry.folderId) return entry.name;
    const folder = cloudFiles.find((candidate) => candidate.id === entry.folderId && candidate.type === "folder");
    return folder ? `${folder.name}/${entry.name}` : entry.name;
  };

  const resolveCloudEntryByPath = (path: string) => {
    const normalized = path.replace(/^\.\/+/, "");
    const exact = cloudFiles.find((entry) => entry.type !== "folder" && getCloudEntryPath(entry) === normalized);
    if (exact) return exact;

    const parts = normalized.split("/").filter(Boolean);
    if (parts.length === 1) return cloudFiles.find((entry) => entry.type !== "folder" && entry.name === parts[0]) || null;

    const folderName = parts[0];
    const fileName = parts.slice(1).join("/");
    const folder = cloudFiles.find((entry) => entry.type === "folder" && entry.name === folderName);
    if (!folder) return null;
    return cloudFiles.find((entry) => entry.type !== "folder" && entry.folderId === folder.id && entry.name === fileName) || null;
  };

  const writeLocalFileByPath = async (path: string, content: string) => {
    if (!localRootHandle) throw new Error("Open a local workspace first.");
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) throw new Error("Invalid file path.");

    let directory = localRootHandle;
    for (const segment of parts) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }

    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return fileHandle;
  };

  const buildAssistantContext = async () => {
    const treeSummary = summarizeNodes(explorerNodes).join("\n") || "- workspace is empty";
    const openTabsSummary = openTabs
      .map((tab) => `### ${tab.path}\n\n\`\`\`${tab.language}\n${tab.content.slice(0, 5000)}\n\`\`\``)
      .join("\n\n");

    let sampleFiles = "";
    if (assistantScope === "current-file" && activeFile) {
      sampleFiles = `### ${activeFile.path}\n\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 5000)}\n\`\`\``;
    } else if (assistantScope === "open-tabs") {
      sampleFiles = openTabsSummary || "- no open tabs";
    } else if (workspaceMode === "local" && localRootHandle) {
      const sampleNodes = flattenNodes(explorerNodes)
        .filter((node) => node.kind === "file" && node.handle && isTextFile(node.name))
        .slice(0, 6);
      const snippets: string[] = [];
      for (const node of sampleNodes) {
        try {
          const file = await node.handle.getFile();
          const text = await file.text();
          snippets.push(`### ${node.path}\n\n\`\`\`${detectLanguage(node.name)}\n${text.slice(0, 5000)}\n\`\`\``);
        } catch {
          snippets.push(`### ${node.path}\n\n- unable to read file contents`);
        }
      }
      sampleFiles = snippets.join("\n\n") || "- no text files available";
    } else {
      sampleFiles =
        cloudFiles
          .filter((entry) => entry.type !== "folder")
          .slice(0, 6)
          .map((entry) => `### ${getCloudEntryPath(entry)}\n\n\`\`\`${detectLanguage(entry.name)}\n${(entry.content || "").slice(0, 5000)}\n\`\`\``)
          .join("\n\n") || "- no cloud files available";
    }

    return { treeSummary, openTabsSummary, sampleFiles };
  };

  const applyAssistantChange = async (change: AssistantChange) => {
    const normalizedPath = change.path.replace(/^\.\/+/, "").trim();
    if (!normalizedPath) return null;

    if (workspaceMode === "local") {
      const fileHandle = await writeLocalFileByPath(normalizedPath, change.content);
      await refreshLocalWorkspace(localRootHandle);
      if (activeFile?.path === normalizedPath) setCode(change.content);
      setOpenTabs((prev) => prev.map((tab) => (tab.path === normalizedPath ? { ...tab, content: change.content } : tab)));
      return { path: normalizedPath, handle: fileHandle };
    }

    const existing = resolveCloudEntryByPath(normalizedPath);
    if (existing) {
      await updateDoc(doc(db, "files", existing.id), {
        content: change.content,
        updatedAt: serverTimestamp(),
        size: Math.max(1, Math.round(new Blob([change.content]).size / 1024)),
      });
      if (activeFile?.path === normalizedPath) setCode(change.content);
      setOpenTabs((prev) => prev.map((tab) => (tab.path === normalizedPath ? { ...tab, content: change.content } : tab)));
      return { path: normalizedPath, id: existing.id };
    }

    const parts = normalizedPath.split("/").filter(Boolean);
    const fileName = parts.pop() || normalizedPath;
    const parentFolderName = parts[0] || "";
    const parentFolder = parentFolderName ? cloudFiles.find((entry) => entry.type === "folder" && entry.name === parentFolderName) : null;
    const docRef = await addDoc(collection(db, "files"), {
      name: fileName,
      type: detectLanguage(fileName),
      content: change.content,
      size: Math.max(1, Math.round(new Blob([change.content]).size / 1024)),
      folderId: parentFolder?.id || null,
      updatedAt: serverTimestamp(),
      lockedBy: null,
    });
    if (activeFile?.path === normalizedPath) setCode(change.content);
    setOpenTabs((prev) => prev.map((tab) => (tab.path === normalizedPath ? { ...tab, content: change.content } : tab)));
    return { path: normalizedPath, id: docRef.id };
  };

  const openLocalFile = async (node: WorkspaceNode) => {
    if (!node.handle) return;
    const file = await node.handle.getFile();
    const content = await file.text();
    const next: OpenFile = {
      id: node.id,
      name: node.name,
      path: node.path,
      language: detectLanguage(node.name),
      content,
      source: "local",
      handle: node.handle,
    };
    upsertTab(next);
    setWorkspaceMode("local");
  };

  const handleExplorerOpen = (node: WorkspaceNode) => {
    if (node.kind === "directory") {
      setSelectedPath(node.path);
      return;
    }
    if (node.source === "local") {
      openLocalFile(node).catch(console.error);
      return;
    }
    const target = cloudFiles.find((entry) => entry.id === node.fileId);
    if (target) openCloudFile(target);
  };

  const updateActiveContent = (nextCode: string) => {
    setCode(nextCode);
    setOpenTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, content: nextCode } : tab)));
  };

  const saveCurrentFile = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      if (activeFile.source === "local" && activeFile.handle) {
        const writable = await activeFile.handle.createWritable();
        await writable.write(code);
        await writable.close();
      }
      if (activeFile.source === "cloud" && activeFile.fileId) {
        await updateDoc(doc(db, "files", activeFile.fileId), {
          content: code,
          updatedAt: serverTimestamp(),
          size: Math.max(1, Math.round(new Blob([code]).size / 1024)),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const closeTab = (tabId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next[0]?.id || "");
      }
      return next;
    });
  };

  const createInLocalWorkspace = async (kind: "file" | "folder") => {
    const parentNode =
      selectedNode?.kind === "directory"
        ? selectedNode
        : selectedPath
          ? findNodeByPath(explorerNodes, getParentPath(selectedPath))
          : null;
    const name = window.prompt(kind === "file" ? "Enter file name" : "Enter folder name", kind === "file" ? "new-file.ts" : "new-folder");
    if (!name) return;

    if (workspaceMode === "local") {
      if (!localRootHandle) {
        await openLocalWorkspace();
        return;
      }
      const targetDirectory = parentNode?.source === "local" && parentNode.kind === "directory" && parentNode.handle ? parentNode.handle : localRootHandle;
      if (kind === "folder") {
        await targetDirectory.getDirectoryHandle(name, { create: true });
        await refreshLocalWorkspace(localRootHandle);
        return;
      }

      const fileHandle = await targetDirectory.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write("// Start building here\n");
      await writable.close();
      await refreshLocalWorkspace(localRootHandle);
      const basePath = parentNode?.source === "local" && parentNode.kind === "directory" ? `${parentNode.path}/${name}` : name;
      await openLocalFile({ id: `local-file-${basePath}`, name, path: basePath, kind: "file", source: "local", handle: fileHandle });
      setSelectedPath(basePath);
      return;
    }

    const folderId = parentNode?.source === "cloud" && parentNode.kind === "directory" ? parentNode.folderId || null : null;
    if (kind === "folder") {
      await addDoc(collection(db, "files"), {
        name,
        type: "folder",
        content: "",
        size: 0,
        folderId,
        updatedAt: serverTimestamp(),
        lockedBy: null,
      });
      return;
    }

    const docRef = await addDoc(collection(db, "files"), {
      name,
      type: detectLanguage(name),
      content: "// Start building here\n",
      size: 1,
      folderId,
      updatedAt: serverTimestamp(),
      lockedBy: null,
    });
    const nextPath = parentNode?.source === "cloud" && parentNode.kind === "directory" ? `${parentNode.path}/${name}` : name;
    upsertTab({
      id: `cloud-${docRef.id}`,
      name,
      path: nextPath,
      language: detectLanguage(name),
      content: "// Start building here\n",
      source: "cloud",
      fileId: docRef.id,
    });
    setSelectedPath(nextPath);
    setShowExplorer(true);
    setSidebarView("explorer");
  };

  const runCurrentFile = async () => {
    if (!activeFile) return;
    setShowOutput(true);
    setIsRunning(true);
    setOutputLines([`$ run ${activeFile.name}`]);

    if (!["javascript", "typescript"].includes(activeFile.language)) {
      setOutputLines((prev) => [...prev, "Preview execution is currently available for JavaScript and TypeScript files."]);
      setIsRunning(false);
      return;
    }

    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      logs.push(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" "));
      originalLog(...args);
    };
    console.error = (...args) => {
      logs.push(`Error: ${args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")}`);
      originalError(...args);
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runner = new AsyncFunction(code);
      const result = await runner();
      if (result !== undefined) logs.push(String(result));
      if (logs.length === 0) logs.push("Execution completed with no console output.");
      setOutputLines((prev) => [...prev, ...logs]);
    } catch (error: any) {
      setOutputLines((prev) => [...prev, `Error: ${error.message}`]);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };

  const shareCurrent = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.path);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const applyAssistantPrompt = (prompt: string, mode?: AssistantMode, scope?: AssistantScope) => {
    if (mode) setAssistantMode(mode);
    if (scope) setAssistantScope(scope);
    setAssistantInput(prompt);
    setShowAssistant(true);
  };

  const clearAssistantSession = () => {
    setAssistantMessages([{ role: "assistant", content: "Assistant session cleared. Ready for the next coding task." }]);
    setAssistantInput("");
    setAssistantStatus(`${selectedProviderProfile.label} agent reset and ready.`);
  };

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim() || isGenerating) return;
    if (assistantScope === "current-file" && !activeFile) {
      setAssistantMessages((prev) => [...prev, { role: "assistant", content: "Open a file first, or switch the scope to open tabs or the entire project." }]);
      return;
    }

    const userPrompt = assistantInput.trim();
    setAssistantMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setAssistantInput("");
    setIsGenerating(true);
    setAssistantStatus(`${selectedProviderProfile.label} is inspecting the workspace and preparing edits...`);

    try {
      const context = await buildAssistantContext();
      const modeDescriptions: Record<AssistantMode, string> = {
        implement: "Implement the requested feature with production-ready code.",
        refactor: "Refactor the relevant files for clarity and maintainability.",
        debug: "Find and fix the bug with the smallest safe change.",
        explain: "Explain the relevant code and only edit if necessary.",
      };
      const scopeDescriptions: Record<AssistantScope, string> = {
        "current-file": "Current file only.",
        "open-tabs": "All open tabs and their current content.",
        "entire-project": "The full loaded project tree and sampled file contents.",
      };

      const response = await fetch("/api/editor/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: assistantProvider,
          providerLabel: selectedProviderProfile.label,
          providerOperatingStyle: selectedProviderProfile.operatingStyle,
          mode: assistantMode,
          modeGuidance: modeDescriptions[assistantMode],
          scope: assistantScope,
          scopeGuidance: scopeDescriptions[assistantScope],
          workspaceMode,
          workspaceRoot: workspaceMode === "local" ? localRootName || "Local Workspace" : "Cloud Workspace",
          githubConnected: auth.currentUser?.providerData.some((provider) => provider.providerId === "github.com") || false,
          treeSummary: context.treeSummary,
          openTabsSummary: context.openTabsSummary || "- none",
          sampleFiles: context.sampleFiles,
          userPrompt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Assistant request failed.");
      }

      const parsed = payload as {
        message?: string;
        changes?: AssistantChange[];
        engine?: string;
        model?: string;
        fallbackUsed?: boolean;
      };
      const appliedPaths: string[] = [];
      for (const change of parsed.changes || []) {
        const applied = await applyAssistantChange(change);
        if (applied?.path) appliedPaths.push(applied.path);
      }

      const executionLabel = parsed.engine ? `${selectedProviderProfile.label} via ${parsed.engine}${parsed.model ? ` (${parsed.model})` : ""}` : selectedProviderProfile.label;
      const summary = [parsed.message || "Project changes applied."];
      if (parsed.fallbackUsed) {
        summary.push(`Requested ${selectedProviderProfile.label}, but the workspace used the available ${parsed.engine || "configured"} engine so editing could continue.`);
      }
      if (appliedPaths.length > 0) {
        summary.push(`Applied ${appliedPaths.length} file${appliedPaths.length === 1 ? "" : "s"}: ${appliedPaths.join(", ")}`);
      }
      setAssistantMessages((prev) => [...prev, { role: "assistant", content: `[${executionLabel}] ${summary.join("\n\n")}` }]);
      setAssistantStatus(
        appliedPaths.length > 0
          ? `${executionLabel} applied ${appliedPaths.length} workspace change${appliedPaths.length === 1 ? "" : "s"}.`
          : `${executionLabel} finished analysis with no file edits.`,
      );
    } catch (error: any) {
      setAssistantMessages((prev) => [...prev, { role: "assistant", content: `Assistant error: ${error.message}` }]);
      setAssistantStatus(`${selectedProviderProfile.label} hit an error while generating changes.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const pushForReview = async () => {
    if (!activeFile || !auth.currentUser || activeFile.source !== "cloud" || !activeFile.fileId) return;
    setIsPushing(true);
    try {
      await createReviewRequest(auth.currentUser, activeFile.fileId, activeFile.name);
      await logActivity(auth.currentUser, {
        type: "review_submitted",
        title: "Changes pushed for review",
        detail: `${auth.currentUser.displayName || auth.currentUser.email} submitted ${activeFile.name} for review.`,
        metadata: { fileId: activeFile.fileId, fileName: activeFile.name },
      });
    } finally {
      setIsPushing(false);
    }
  };

  const assistantExamples = [
    "Refactor the current file for readability.",
    "Implement the missing feature across the project.",
    "Fix the bug causing this page to crash.",
    "Explain the workspace structure and suggest improvements.",
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <section className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),linear-gradient(180deg,#111216,#09090b)] px-6 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Editor Workspace
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">A clearer VS Code-style editor with local workspace access</h1>
            <p className="mt-2 text-sm text-zinc-400">Open a folder from your computer, create files locally, edit them directly, and use the assistant on the active file.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowExplorer((prev) => !prev);
                if (!showExplorer) setSidebarView("explorer");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              {showExplorer ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              {showExplorer ? "Hide Sidebar" : "Show Sidebar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExplorer(true);
                setSidebarView("explorer");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              <Files className="h-4 w-4" />
              Explorer
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExplorer(true);
                setSidebarView("github");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
            <button
              type="button"
              onClick={() => setShowAssistant((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              <Bot className="h-4 w-4" />
              Agent
            </button>
            <button onClick={openLocalWorkspace} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]">
              <FolderOpen className="h-4 w-4" />
              Open Local Workspace
            </button>
            <button onClick={saveCurrentFile} disabled={!activeFile || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={runCurrentFile} disabled={!activeFile || isRunning} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50">
              <Play className="h-4 w-4" />
              Run
            </button>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/8 bg-[#0f1013] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="flex w-14 flex-col items-center gap-4 border-r border-white/6 bg-[#111216] py-4">
          <button type="button" title="Explorer" onClick={() => { setShowExplorer(true); setSidebarView("explorer"); }} className={`rounded-xl p-2.5 transition ${showExplorer && sidebarView === "explorer" ? "bg-[#1b1d23] text-white" : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"}`}>
            <Files className="h-5 w-5" />
          </button>
          <button type="button" title="GitHub" onClick={() => { setShowExplorer(true); setSidebarView("github"); }} className={`rounded-xl p-2.5 transition ${showExplorer && sidebarView === "github" ? "bg-[#1b1d23] text-white" : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"}`}>
            <Github className="h-5 w-5" />
          </button>
          <button type="button" title="Agent" onClick={() => setShowAssistant(true)} className={`rounded-xl p-2.5 transition ${showAssistant ? "bg-[#1b1d23] text-white" : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"}`}>
            <Bot className="h-5 w-5" />
          </button>
          <div className="mt-auto rounded-xl p-2.5 text-zinc-500" title="Workspace">
            <LayoutGrid className="h-5 w-5" />
          </div>
        </div>

        {showExplorer && (
          <aside className="flex w-[280px] flex-col border-r border-white/6 bg-[#15171c]">
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{sidebarView === "github" ? "GitHub" : "Explorer"}</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{sidebarView === "github" ? "Repository workspace" : workspaceMode === "local" ? localRootName || "Local Workspace" : "Cloud Workspace"}</p>
              </div>
              <div className="flex items-center gap-1">
                {sidebarView === "explorer" && (
                  <>
                    <button type="button" onClick={() => createInLocalWorkspace("file")} className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.05] hover:text-white">
                      <FilePlus2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => createInLocalWorkspace("folder")} className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.05] hover:text-white">
                      <FolderPlus className="h-4 w-4" />
                    </button>
                    {workspaceMode === "local" && (
                      <button type="button" onClick={() => refreshLocalWorkspace()} className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.05] hover:text-white">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {sidebarView === "explorer" ? (
              <>
                <div className="border-b border-white/6 px-4 py-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={explorerSearch}
                      onChange={(event) => setExplorerSearch(event.target.value)}
                      placeholder="Search files and folders"
                      className="w-full rounded-2xl border border-white/10 bg-[#0f1014] py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/40 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {filteredExplorerNodes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
                      {workspaceMode === "local"
                        ? "No files found in this local folder yet."
                        : "No cloud files are available yet. Open a local workspace or create files from Team Workspace."}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredExplorerNodes.map((node) => (
                        <ExplorerNode key={node.id} node={node} activePath={selectedPath} onOpen={handleExplorerOpen} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Repository status</p>
                    <GitBranch className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div className="rounded-xl border border-white/10 px-3 py-2">Cloud files: {cloudFiles.filter((entry) => entry.type !== "folder").length}</div>
                    <div className="rounded-xl border border-white/10 px-3 py-2">Open tabs: {openTabs.length}</div>
                    <div className="rounded-xl border border-white/10 px-3 py-2">Workspace: {workspaceMode}</div>
                    <div className="rounded-xl border border-white/10 px-3 py-2">Reviews: {reviewRequests.length}</div>
                  </div>
                  <button type="button" onClick={() => navigate("/workspace")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
                    <Eye className="h-4 w-4" />
                    Open Team Workspace
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-sm font-medium text-white">Latest files</p>
                  <div className="mt-3 space-y-2">
                    {cloudFiles.filter((entry) => entry.type !== "folder").slice(0, 5).map((file) => (
                      <div key={file.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-sm text-zinc-300">
                        {file.name}
                      </div>
                    ))}
                    {cloudFiles.length === 0 && <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-sm text-zinc-500">No cloud files yet.</div>}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        <section className="flex min-w-0 flex-1 flex-col bg-[#1e1f24]">
          <div className="flex items-center justify-between border-b border-white/6 bg-[#181a1f] px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              {openTabs.length === 0 && <span className="text-sm text-zinc-500">No file open</span>}
              {openTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm ${activeTabId === tab.id ? "bg-[#1e1f24] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  <FileCode2 className="h-4 w-4" />
                  <span>{tab.name}</span>
                  <span onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06]">
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {activeFile && <span>{activeFile.source === "local" ? "Local" : "Cloud"}</span>}
              {isCopied && <span className="text-emerald-300">Copied path</span>}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-white/6 bg-[#111216] px-4 py-2 text-sm text-zinc-400">
              <div className="flex items-center gap-3">
                <span>{activeFile?.path || "Open a file to start editing"}</span>
                {activeFile && <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs uppercase tracking-[0.16em]">{activeFile.language}</span>}
              </div>
              <div className="flex items-center gap-2">
                {activeFile && (
                  <button onClick={shareCurrent} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/[0.05] hover:text-white">
                    <Share2 className="h-4 w-4" />
                    Path
                  </button>
                )}
                {activeFile?.source === "cloud" && auth.currentUser && (
                  <button onClick={pushForReview} disabled={isPushing} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    {isPushing ? "Pushing..." : "Review"}
                  </button>
                )}
                <button onClick={() => setShowAssistant((prev) => !prev)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/[0.05] hover:text-white">
                  {showAssistant ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />} Assistant
                </button>
              </div>
            </div>

            <div ref={editorWorkspaceRef} className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 bg-[#1e1f24]">
                  <Editor
                    height="100%"
                    language={activeFile?.language || "plaintext"}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => updateActiveContent(value || "")}
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                      lineHeight: 22,
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      renderWhitespace: "selection",
                    }}
                  />
                </div>

                {showOutput && (
                  <div className="h-[180px] border-t border-white/6 bg-[#111216]">
                    <div className="flex items-center justify-between border-b border-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      <div className="flex items-center gap-2">
                        <TerminalSquare className="h-4 w-4" /> Output
                      </div>
                      <button onClick={() => setShowOutput(false)} className="text-zinc-500 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="h-[140px] overflow-y-auto px-4 py-3 font-mono text-sm text-zinc-300">
                      {outputLines.map((line, index) => (
                        <div key={`${line}-${index}`} className={line.startsWith("Error:") ? "text-red-400" : line.startsWith("$") ? "text-emerald-300" : ""}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {showAssistant && (
                <>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize assistant panel"
                    onMouseDown={() => setIsResizingAssistant(true)}
                    className="group relative w-3 shrink-0 cursor-col-resize touch-none select-none bg-[#101116] transition hover:bg-blue-500/25 active:bg-blue-500/35"
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/8 group-hover:bg-blue-400/60" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1 rounded-full border border-white/10 bg-[#17181d] px-1 py-2 shadow-lg">
                      <span className="h-1 w-1 rounded-full bg-zinc-500 group-hover:bg-blue-300" />
                      <span className="h-1 w-1 rounded-full bg-zinc-500 group-hover:bg-blue-300" />
                      <span className="h-1 w-1 rounded-full bg-zinc-500 group-hover:bg-blue-300" />
                    </div>
                  </div>

                  <aside style={{ width: `${assistantPanelWidth}px` }} className="flex h-full min-h-0 w-[440px] shrink-0 flex-col border-l border-white/6 bg-[#131419]">
                        <div className="border-b border-white/6 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-xl border p-2 ${selectedProviderProfile.accent}`}>
                              <Bot className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">Antigravity Agent Workspace</p>
                              <p className="text-xs text-zinc-500">VS Code-style coding assistant with provider profiles, project context, and multi-file edits.</p>
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Agent providers</p>
                              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${selectedProviderProfile.accent}`}>
                                {selectedProviderProfile.label}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {(Object.keys(assistantProviderProfiles) as AssistantProvider[]).map((provider) => (
                                <button
                                  key={provider}
                                  type="button"
                                  onClick={() => setAssistantProvider(provider)}
                                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                                    assistantProvider === provider
                                      ? assistantProviderProfiles[provider].accent
                                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                                  }`}
                                >
                                  <div className="text-sm font-semibold">{assistantProviderProfiles[provider].label}</div>
                                  <div className="mt-1 text-[11px] leading-5 opacity-80">{assistantProviderProfiles[provider].summary}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Project access</p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                                Live
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {(["implement", "refactor", "debug", "explain"] as AssistantMode[]).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => setAssistantMode(mode)}
                                  className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${assistantMode === mode ? "bg-white text-black" : "border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"}`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(["current-file", "open-tabs", "entire-project"] as AssistantScope[]).map((scope) => (
                                <button
                                  key={scope}
                                  type="button"
                                  onClick={() => setAssistantScope(scope)}
                                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${assistantScope === scope ? "bg-blue-500 text-white" : "border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"}`}
                                >
                                  {scope.replace("-", " ")}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                              {assistantStatus}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => applyAssistantPrompt(`Inspect ${activeFile?.name || "the current workspace"} and propose the best implementation plan before editing.`, "implement", activeFile ? "current-file" : "entire-project")} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]">
                              <Sparkles className="mb-2 h-4 w-4 text-emerald-300" />
                              Plan first
                            </button>
                            <button type="button" onClick={() => applyAssistantPrompt(`Debug the current problem in ${activeFile?.name || "the loaded project"} and fix the root cause.`, "debug", activeFile ? "current-file" : "entire-project")} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]">
                              <Wand2 className="mb-2 h-4 w-4 text-orange-300" />
                              Fix issue
                            </button>
                            <button type="button" onClick={() => applyAssistantPrompt(`Explain how ${activeFile?.name || "this project"} works and what should be improved next.`, "explain", activeFile ? "current-file" : "entire-project")} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]">
                              <Eye className="mb-2 h-4 w-4 text-blue-300" />
                              Explain code
                            </button>
                            <button type="button" onClick={clearAssistantSession} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]">
                              <RefreshCw className="mb-2 h-4 w-4 text-zinc-300" />
                              Reset chat
                            </button>
                          </div>
                          <div className="grid gap-2">
                            {assistantExamples.map((example) => (
                              <button key={example} type="button" onClick={() => setAssistantInput(example)} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]">
                                <Wand2 className="mb-2 h-4 w-4 text-blue-300" />
                                {example}
                              </button>
                            ))}
                          </div>
                          {assistantMessages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={`rounded-2xl border p-3 text-sm ${message.role === "assistant" ? "border-white/8 bg-white/[0.02] text-zinc-200" : "border-blue-500/20 bg-blue-500/10 text-blue-50"}`}>
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{message.role === "assistant" ? "Assistant" : "You"}</div>
                              <div className="whitespace-pre-wrap leading-6">{message.content}</div>
                            </div>
                          ))}
                          {isGenerating && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm text-zinc-400">
                              {selectedProviderProfile.label} is generating code edits for the loaded workspace...
                            </div>
                          )}
                        </div>
                        <form onSubmit={handleAssistantSubmit} className="border-t border-white/6 p-4">
                          <div className="mb-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-zinc-500">
                            {assistantScope === "current-file" && !activeFile
                              ? "Open a file to use current-file scope, or switch to open tabs / entire project."
                              : activeFile
                                ? `${selectedProviderProfile.label} is focused on ${activeFile.name}`
                                : `${selectedProviderProfile.label} project agent is ready`}
                          </div>
                          <div className="relative">
                            <textarea
                              value={assistantInput}
                              onChange={(e) => setAssistantInput(e.target.value)}
                              disabled={isGenerating}
                              rows={4}
                              placeholder="Ask for a feature, refactor, or bug fix across the loaded project..."
                              className="w-full rounded-2xl border border-white/10 bg-[#0f1014] px-4 py-3 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 disabled:opacity-50"
                            />
                            <button type="submit" disabled={!assistantInput.trim() || isGenerating || (assistantScope === "current-file" && !activeFile)} className="absolute bottom-3 right-3 rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500">
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </form>
                  </aside>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

