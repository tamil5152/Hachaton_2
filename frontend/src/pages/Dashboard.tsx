import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  FileCode2,
  FolderKanban,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

type ActivityItem = {
  id: string;
  type?: string;
  title?: string;
  detail?: string;
  userName?: string;
  createdAt?: { toDate?: () => Date };
};

type UserItem = {
  id: string;
  status?: string;
  displayName?: string;
  email?: string;
  hasGithub?: boolean;
  lastLoginAt?: { toDate?: () => Date };
};

type FileItem = {
  id: string;
  type?: string;
  lockedBy?: string | null;
  updatedAt?: { toDate?: () => Date };
};

const formatTimeAgo = (value?: { toDate?: () => Date }) => {
  if (!value?.toDate) return "Just now";

  const date = value.toDate();
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const inLastHours = (value: { toDate?: () => Date } | undefined, hours: number) => {
  if (!value?.toDate) return false;
  return Date.now() - value.toDate().getTime() <= hours * 60 * 60 * 1000;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  support,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  support: string;
}) => (
  <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(10,10,12,0.98))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
    <div className="flex items-start justify-between">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
        Live
      </span>
    </div>
    <div className="mt-6">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <h3 className="mt-2 text-4xl font-semibold tracking-tight text-white">{value}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{support}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [members, setMembers] = useState<UserItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setMembers(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<UserItem, "id">) })));
    });

    const unsubFiles = onSnapshot(collection(db, "files"), (snapshot) => {
      setFiles(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<FileItem, "id">) })));
    });

    const unsubMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
      setMessagesCount(snapshot.size);
    });

    const recentActivityQuery = query(collection(db, "activity"), orderBy("createdAt", "desc"), limit(20));
    const unsubActivity = onSnapshot(recentActivityQuery, (snapshot) => {
      setActivity(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<ActivityItem, "id">) })));
    });

    return () => {
      unsubUsers();
      unsubFiles();
      unsubMessages();
      unsubActivity();
    };
  }, []);

  const metrics = useMemo(() => {
    const onlineMembers = members.filter((member) => member.status === "online").length;
    const githubConnected = members.filter((member) => member.hasGithub).length;
    const createdFiles = files.filter((file) => file.type && file.type !== "folder").length;
    const activeEditors = files.filter((file) => !!file.lockedBy).length;
    const signinsToday = activity.filter(
      (item) => (item.type === "login" || item.type === "signup") && inLastHours(item.createdAt, 24)
    ).length;
    const collaborationEvents = activity.filter(
      (item) =>
        ["message_sent", "file_uploaded", "file_created", "review_submitted"].includes(item.type || "") &&
        inLastHours(item.createdAt, 24)
    ).length;

    const activityByType = [
      { label: "Authentication", count: activity.filter((item) => item.type === "login" || item.type === "signup").length, color: "bg-blue-500" },
      { label: "Messages", count: activity.filter((item) => item.type === "message_sent").length, color: "bg-emerald-500" },
      { label: "Files", count: activity.filter((item) => item.type === "file_uploaded" || item.type === "file_created").length, color: "bg-amber-500" },
      { label: "Reviews", count: activity.filter((item) => item.type === "review_submitted").length, color: "bg-fuchsia-500" },
    ];

    return {
      onlineMembers,
      githubConnected,
      createdFiles,
      activeEditors,
      signinsToday,
      collaborationEvents,
      activityByType,
    };
  }, [activity, files, members]);

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_26%),linear-gradient(180deg,#121216,#09090b)] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:38px_38px] opacity-20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Operations Overview
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Real-time collaboration intelligence for your workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
              Live metrics are now pulled from authenticated users, shared files, chat traffic, and activity events in Firestore.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Last refresh</p>
              <p className="mt-2 text-sm font-medium text-white">Realtime sync</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Sign-ins</p>
              <p className="mt-2 text-sm font-medium text-white">{formatNumber(metrics.signinsToday)} today</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Active editors</p>
              <p className="mt-2 text-sm font-medium text-white">{formatNumber(metrics.activeEditors)} locked files</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Workspace health</p>
              <p className="mt-2 text-sm font-medium text-emerald-300">Connected</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered Members"
          value={formatNumber(members.length)}
          support={`${formatNumber(metrics.onlineMembers)} currently online in this workspace.`}
        />
        <StatCard
          icon={UserCheck}
          label="Authentication Activity"
          value={formatNumber(metrics.signinsToday)}
          support="Successful sign-ins and new account creations over the last 24 hours."
        />
        <StatCard
          icon={FileCode2}
          label="Shared Assets"
          value={formatNumber(metrics.createdFiles)}
          support={`${formatNumber(metrics.activeEditors)} file sessions are actively locked for editing.`}
        />
        <StatCard
          icon={MessageSquareMore}
          label="Collaboration Events"
          value={formatNumber(metrics.collaborationEvents)}
          support={`${formatNumber(messagesCount)} total chat messages captured across the workspace.`}
        />
      </section>

      <section className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#101014,#0a0a0c)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Workspace Performance</h2>
              <p className="mt-1 text-sm text-zinc-500">Operational view across access, involvement, assets, and integrations.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Clock3 className="h-3.5 w-3.5" />
              Live from Firestore
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Connected identities</p>
                  <p className="text-3xl font-semibold text-white">{formatNumber(metrics.githubConnected)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Members with GitHub linked and available for repository-connected workflows.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <FolderKanban className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Workspace involvement</p>
                  <p className="text-3xl font-semibold text-white">{formatNumber(metrics.collaborationEvents)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Messages, uploads, file creation, and review submissions recorded in the last 24 hours.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-300" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Event Distribution</h3>
            </div>
            <div className="mt-5 space-y-4">
              {metrics.activityByType.map((item) => {
                const total = Math.max(activity.length, 1);
                const width = `${Math.max((item.count / total) * 100, item.count > 0 ? 10 : 0)}%`;
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{item.label}</span>
                      <span className="font-medium text-white">{formatNumber(item.count)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#101014,#0a0a0c)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-300" />
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Latest events generated by your team in realtime.</p>

          <div className="mt-6 space-y-4">
            {activity.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="text-sm text-zinc-400">No live events yet. Sign in, send a message, or create a file to populate the dashboard.</p>
              </div>
            )}

            {activity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.title || "Workspace event"}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{item.detail}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-zinc-500">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <span>{item.type?.replaceAll("_", " ") || "event"}</span>
                  <span>{item.userName || "system"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
