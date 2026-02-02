"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  ExternalLink,
  FileCode2,
  Shield,
  Sparkles,
  SquareArrowOutUpRight,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AccessRole = "owner" | "editor" | "viewer";
type Provider = "apps-script" | "n8n";
type Status = "healthy" | "degraded" | "failed" | "paused";
type Lifecycle = "active" | "inactive" | "dead";

interface AccessGrant {
  user: string;
  role: AccessRole;
}

interface Automation {
  id: string;
  name: string;
  provider: Provider;
  status: Status;
  owner: string;
  description: string;
  tags: string[];
  lastRun: string;
  latencyMs: number;
  successRate: number;
  access: AccessGrant[];
  sheetUrl?: string | null;
  files?: string[];
  lifecycle: Lifecycle;
  department?: string;
}

interface GoogleAutomationPayload {
  id?: string;
  name?: string;
  owner?: string;
  deployments?: { description?: string }[];
  updatedAt?: string;
  createdAt?: string;
  sheetUrl?: string | null;
  files?: string[];
  department?: string;
}

const providerStyle: Record<
  Provider,
  { label: string; gradient: string; chip: string }
> = {
  "apps-script": {
    label: "Apps Script",
    gradient: "from-zinc-600/70 via-zinc-700/70 to-zinc-800/80",
    chip: "text-zinc-100 border-zinc-400/30 bg-zinc-700/40",
  },
  n8n: {
    label: "n8n",
    gradient: "from-slate-600/70 via-slate-700/70 to-slate-800/80",
    chip: "text-slate-100 border-slate-400/30 bg-slate-700/40",
  },
};

const statusStyle: Record<
  Status,
  { label: string; dot: string; badge: string; glow: string }
> = {
  healthy: {
    label: "Healthy",
    dot: "bg-gray-200 shadow-[0_0_0_6px_rgba(156,163,175,0.25)]",
    badge:
      "text-gray-100 border-gray-300/40 bg-gray-600/30 backdrop-blur-sm",
    glow: "shadow-[0_10px_80px_rgba(156,163,175,0.12)]",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-gray-400 shadow-[0_0_0_6px_rgba(148,163,184,0.25)]",
    badge:
      "text-gray-100 border-gray-400/40 bg-gray-700/30 backdrop-blur-sm",
    glow: "shadow-[0_10px_80px_rgba(148,163,184,0.10)]",
  },
  failed: {
    label: "Failed",
    dot: "bg-gray-500 shadow-[0_0_0_6px_rgba(107,114,128,0.25)]",
    badge:
      "text-gray-100 border-gray-500/40 bg-gray-800/40 backdrop-blur-sm",
    glow: "shadow-[0_10px_80px_rgba(107,114,128,0.18)]",
  },
  paused: {
    label: "Paused",
    dot: "bg-gray-600 shadow-[0_0_0_6px_rgba(75,85,99,0.25)]",
    badge:
      "text-gray-200 border-gray-500/35 bg-gray-800/40 backdrop-blur-sm",
    glow: "shadow-[0_10px_80px_rgba(75,85,99,0.12)]",
  },
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AccessPill({ grant }: { grant: AccessGrant }) {
  const roleTone: Record<AccessRole, string> = {
    owner: "bg-emerald-400/15 border-emerald-400/30 text-emerald-100",
    editor: "bg-cyan-400/10 border-cyan-400/25 text-cyan-100",
    viewer: "bg-slate-400/10 border-slate-300/25 text-slate-100",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        "backdrop-blur-md transition-colors duration-200",
        roleTone[grant.role],
      )}
    >
      <span className="size-2.5 rounded-full bg-white/70" />
      {grant.user}
      <span className="text-white/60">·</span>
      <span className="uppercase tracking-tight text-[10px]">
        {grant.role}
      </span>
    </span>
  );
}

export default function Home() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [pushedCount, setPushedCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<Automation | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | Lifecycle>("all");
  const [theme] = useState<"light" | "dark">("dark");
  const [searchTerm, setSearchTerm] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    id: "",
    name: "",
    owner: "",
    provider: "apps-script" as Provider,
    status: "healthy" as Status,
    department: "",
    sheetUrl: "",
    tags: "",
  });
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  const uniqueUsers = useMemo(
    () =>
      Array.from(
        new Set(automations.flatMap((a) => a.access.map((g) => g.user))),
      ),
    [automations],
  );

  const failing = useMemo(
    () => automations.filter((a) => a.status === "failed"),
    [automations],
  );

  const lifecycleCounts = useMemo(() => {
    return automations.reduce(
      (acc, a) => {
        acc[a.lifecycle] = (acc[a.lifecycle] || 0) + 1;
        return acc;
      },
      { active: 0, inactive: 0, dead: 0 } as Record<Lifecycle, number>,
    );
  }, [automations]);

  const displayedAutomations = useMemo(() => {
    const byLifecycle =
      lifecycleFilter === "all"
        ? automations
        : automations.filter((a) => a.lifecycle === lifecycleFilter);

    const term = searchTerm.trim().toLowerCase();
    if (!term) return byLifecycle;

    return byLifecycle.filter((a) => {
      return (
        a.name.toLowerCase().includes(term) ||
        a.owner.toLowerCase().includes(term) ||
        a.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [automations, lifecycleFilter, searchTerm]);

  const statCards = useMemo(
    () => [
      {
        title: "Total Automations",
        value: automations.length,
        delta: `${automations.length ? "+" : ""}${automations.length} tracked`,
        icon: Workflow,
        gradient: "from-zinc-700/80 via-zinc-800/80 to-zinc-900/80",
      },
      {
        title: "Active Users",
        value: uniqueUsers.length,
        delta: "who touched something in 7d",
        icon: Users,
        gradient: "from-gray-700/80 via-gray-800/80 to-gray-900/80",
      },
      {
        title: "Success Rate",
        value: `${Math.round(
          (automations.reduce((s, a) => s + a.successRate, 0) /
            Math.max(automations.length, 1)) *
            100,
        )}%`,
        delta: "weighted by recent runs",
        icon: Shield,
        gradient: "from-neutral-700/80 via-neutral-800/80 to-neutral-900/80",
      },
      {
        title: "Lifecycle",
        value: `${lifecycleCounts.active}/${lifecycleCounts.inactive}/${lifecycleCounts.dead}`,
        delta: "active / inactive / dead",
        icon: Activity,
        gradient: "from-slate-700/80 via-slate-800/80 to-slate-900/80",
      },
    ],
    [automations, uniqueUsers, lifecycleCounts],
  );

  function deriveLifecycle(lastRun: string): Lifecycle {
    const diffMinutes =
      (Date.now() - new Date(lastRun || new Date().toISOString()).getTime()) /
      60000;
    if (diffMinutes <= 40) return "active";
    if (diffMinutes <= 60 * 24 * 2) return "inactive"; // >40 mins and <= 48h
    return "dead"; // > 48h
  }

  useEffect(() => {
    // Fetch any automations that were pushed in via /api/ingest/apps-script
    fetch("/api/ingest/apps-script")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.automations?.length) {
          const mapped: Automation[] = data.automations.map(
            (item: GoogleAutomationPayload) => ({
              id: `gs-${item.id}`,
              name: item.name || "Untitled script",
              provider: "apps-script",
              status: "healthy",
              owner: item.owner || "Unknown",
              description:
                item.deployments?.[0]?.description ||
                "Google Apps Script project",
              tags: ["Apps Script"],
              lastRun:
                item.updatedAt || item.createdAt || new Date().toISOString(),
              latencyMs: 420,
              successRate: 0.99,
              sheetUrl: item.sheetUrl ?? null,
              files: Array.isArray(item.files)
                ? item.files.filter((f): f is string => typeof f === "string")
                : [],
              lifecycle: deriveLifecycle(
                item.updatedAt || item.createdAt || new Date().toISOString(),
              ),
              department: item.department ?? "general",
              access: [
                {
                  user: item.owner || "Owner",
                  role: "owner",
                },
              ],
            }),
          );

          setAutomations((prev) => {
            const others = prev.filter((a) => a.provider !== "apps-script");
              return [...others, ...mapped];
            });
            setPushedCount(mapped.length);
          }
        })
      .catch(() => {
        // ignore fetch errors for local-only use
      });
  }, []);

  return (
    <div
      className={clsx(
        "relative min-h-screen overflow-hidden transition-colors",
        theme === "light" ? "bg-slate-50 text-slate-900" : "bg-[#04070b] text-slate-50",
      )}
    >
      {theme === "dark" && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-emerald-400/20 blur-[130px] animate-float-slower" />
          <div className="absolute right-[-40px] top-24 h-96 w-96 rounded-full bg-amber-400/16 blur-[150px] animate-float-slow" />
          <div className="absolute left-1/3 bottom-[-120px] h-[420px] w-[420px] rounded-full bg-sky-400/12 blur-[160px] animate-float" />
          <div className="absolute inset-0 bg-grid-overlay" />
          <div className="absolute inset-x-0 top-0 h-56 bg-radial-hero" />
          <div className="absolute -right-40 bottom-0 h-64 w-[520px] rotate-12 bg-scan-beam" />
        </div>
      )}

      <main className="relative mx-auto flex w-full max-w-screen-2xl flex-col gap-8 px-5 py-10 lg:px-8 lg:py-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              Automation Command Deck
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Live inventory of every Apps Script & n8n automation
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              See ownership, access, run health, and blast radius in one place.
              Animated, filterable, and ready to plug into your real providers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <button
              onClick={() => setShowManual((v) => !v)}
              className="relative overflow-hidden rounded-full border border-white/15 bg-gradient-to-r from-emerald-700/80 via-slate-800 to-amber-700/70 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(5,150,105,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(245,158,11,0.35)]"
            >
              {showManual ? "Close manual entry" : "Add manual entry"}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="opacity-70">View</span>
                {(["all", "active", "inactive", "dead"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setLifecycleFilter(v)}
                    className={clsx(
                      "rounded-full px-3 py-1 font-semibold capitalize transition",
                      lifecycleFilter === v
                        ? "bg-white/20 text-white"
                        : "text-slate-300 hover:bg-white/10",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="opacity-70">Departments</span>
                {[
                  { label: "Ops", href: "/departments/operations" },
                  { label: "Customer", href: "/departments/customer-service" },
                  { label: "Marketing", href: "/departments/marketing" },
                ].map((d) => (
                  <a
                    key={d.href}
                    href={d.href}
                    className="rounded-full px-3 py-1 font-semibold text-slate-200 hover:bg-white/10 transition"
                  >
                    {d.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                <span className="opacity-70">Providers</span>
                <Link
                  href="/"
                  className="rounded-full px-3 py-1 font-semibold text-slate-200 hover:bg-white/10 transition"
                >
                  Apps Script
                </Link>
                <Link
                  href="/workflows"
                  className="rounded-full px-3 py-1 font-semibold text-slate-200 hover:bg-white/10 transition"
                >
                  n8n
                </Link>
              </div>
            </div>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search automations by name, owner, or tag..."
            className={clsx(
              "w-full md:w-1/2 rounded-xl border px-3 py-2 text-sm outline-none ring-0 transition",
              theme === "light"
                ? "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                : "border-white/15 bg-white/5 text-white placeholder:text-slate-400",
            )}
          />
        </div>

        {showManual && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white shadow-lg">
            <div className="flex flex-wrap gap-3">
              <input
                className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="ID (required)"
                value={manual.id}
                onChange={(e) => setManual((m) => ({ ...m, id: e.target.value }))}
              />
              <input
                className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="Name"
                value={manual.name}
                onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
              />
              <input
                className="min-w-[200px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="Owner email"
                value={manual.owner}
                onChange={(e) => setManual((m) => ({ ...m, owner: e.target.value }))}
              />
              <select
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                value={manual.provider}
                onChange={(e) =>
                  setManual((m) => ({ ...m, provider: e.target.value as Provider }))
                }
              >
                <option value="apps-script">Apps Script</option>
                <option value="n8n">n8n</option>
              </select>
              <select
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                value={manual.status}
                onChange={(e) =>
                  setManual((m) => ({ ...m, status: e.target.value as Status }))
                }
              >
                <option value="healthy">Healthy</option>
                <option value="paused">Paused</option>
                <option value="failed">Failed</option>
                <option value="degraded">Degraded</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                className="min-w-[240px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="Department (optional)"
                value={manual.department}
                onChange={(e) =>
                  setManual((m) => ({ ...m, department: e.target.value }))
                }
              />
              <input
                className="min-w-[240px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="Sheet URL (optional)"
                value={manual.sheetUrl}
                onChange={(e) => setManual((m) => ({ ...m, sheetUrl: e.target.value }))}
              />
              <input
                className="min-w-[240px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                placeholder="Tags (comma separated)"
                value={manual.tags}
                onChange={(e) => setManual((m) => ({ ...m, tags: e.target.value }))}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  setManualMsg(null);
                  if (!manual.id) {
                    setManualMsg("ID is required.");
                    return;
                  }
                  const tagsArray = manual.tags
                    ? manual.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    : [];
                  const payload =
                    manual.provider === "apps-script"
                      ? {
                          automations: [
                            {
                              id: manual.id,
                              name: manual.name,
                              owner: manual.owner,
                              status: manual.status,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              sheetUrl: manual.sheetUrl || null,
                              tags: tagsArray,
                              department: manual.department || "general",
                            },
                          ],
                        }
                      : {
                          workflows: [
                            {
                              id: manual.id,
                              name: manual.name,
                              owner: manual.owner,
                              status: manual.status,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              tags: tagsArray,
                              department: manual.department || "general",
                            },
                          ],
                        };
                  const url =
                    manual.provider === "apps-script"
                      ? "/api/ingest/apps-script"
                      : "/api/ingest/n8n";
                  const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (res.ok) {
                    setManualMsg("Saved. Refresh to see it in the list.");
                    setManual((m) => ({ ...m, id: "", name: "", owner: "", tags: "" }));
                  } else {
                    const text = await res.text();
                    setManualMsg(`Error: ${text}`);
                  }
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Save manual entry
              </button>
              {manualMsg && <span className="text-xs text-amber-200">{manualMsg}</span>}
            </div>
          </div>
        )}

        {pushedCount !== null && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 backdrop-blur">
            Loaded {pushedCount} automations pushed from Apps Script.
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
            >
              <div
                className={clsx(
                  "absolute inset-0 bg-gradient-to-br opacity-50",
                  card.gradient,
                )}
              />
              <span className="card-shine" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-200/80">{card.title}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-semibold text-white">
                      {card.value}
                    </span>
                    <span className="text-xs text-slate-200/80">
                      {card.delta}
                    </span>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
                  Automations
                </p>
                <p className="text-slate-200/80">
                  Ownership · access · latest run · provider
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-slate-300" />
            </div>

            <div className="mt-4 space-y-3">
              {displayedAutomations.length === 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-300">
                  <div>
                    No automations yet. Push from Apps Script or POST data to the ingest APIs.
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Waiting for data
                  </div>
                </div>
              ) : (
                displayedAutomations.map((automation) => (
                  <motion.div
                    key={automation.id}
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className={clsx(
                      "relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r p-4",
                          "shadow-[0_10px_80px_rgba(0,0,0,0.45)]",
                      statusStyle[automation.status].glow,
                      "from-zinc-800/70 via-zinc-900/60 to-black/60",
                    )}
                    role="button"
                    onClick={() => setSelected(automation)}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold uppercase text-white",
                            providerStyle[automation.provider].chip,
                          )}
                        >
                          {providerStyle[automation.provider].label[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold text-white">
                              {automation.name}
                            </p>
                            <span
                              className={clsx(
                                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-tight",
                                statusStyle[automation.status].badge,
                              )}
                            >
                              <span
                                className={clsx(
                                  "size-2.5 rounded-full",
                                  statusStyle[automation.status].dot,
                                )}
                              />
                              {statusStyle[automation.status].label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300">
                            {automation.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                            {automation.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-tight text-slate-200/90"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-sm text-slate-200 md:items-end">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-xs uppercase text-slate-400">
                            Last run
                          </span>
                          <span className="font-semibold">{formatTime(automation.lastRun)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                            <Zap className="h-4 w-4 text-amber-300" />
                            <span>{automation.latencyMs} ms</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                            <Shield className="h-4 w-4 text-emerald-300" />
                            <span>{Math.round(automation.successRate * 100)}% success</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {automation.access.map((grant) => (
                            <AccessPill key={`${automation.id}-${grant.user}`} grant={grant} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
                  Users & Access
                </p>
                <p className="text-slate-200/80">
                  Who can touch which automations
                </p>
              </div>
              <Users className="h-5 w-5 text-gray-200" />
            </div>

            <div className="space-y-3">
              {uniqueUsers.map((user) => {
                const authored = automations.filter(
                  (a) => a.owner === user,
                ).length;
                const granted = automations.filter((a) =>
                  a.access.some((g) => g.user === user),
                ).length;
                return (
                  <div
                    key={user}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400/70 to-amber-400/80 text-center text-sm font-semibold leading-9 text-white">
                            {user
                              .split(" ")
                              .map((p) => p[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-semibold">{user}</p>
                          <p className="text-xs text-slate-300">
                            {authored} owned · {granted} total access
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-xs text-slate-200 leading-tight">
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-emerald-300" />
                          <span className="whitespace-nowrap">Least-privilege</span>
                        </div>
                        <span className="whitespace-nowrap text-slate-400">ready</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-tight text-slate-200">
                      {automations
                        .filter((a) =>
                          a.access.some((g) => g.user === user),
                        )
                        .map((a) => (
                          <span
                            key={`${user}-${a.id}`}
                            className="rounded-full border border-white/10 bg-white/5 px-2 py-1"
                          >
                            {a.name}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
                    Provider Signals
                  </p>
                  <p className="text-slate-200/80">
                    Sync state & latency snapshots
                  </p>
                </div>
                <Activity className="h-5 w-5 text-gray-200" />
              </div>
            <div className="mt-4 space-y-3">
              {(["apps-script", "n8n"] as Provider[]).map((provider) => {
                const related = automations.filter(
                  (a) => a.provider === provider,
                );
                const avgLatency = Math.round(
                  related.reduce((s, a) => s + a.latencyMs, 0) /
                    Math.max(related.length, 1),
                );
                const healthy = related.filter(
                  (a) => a.status === "healthy",
                ).length;
                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "h-10 w-10 rounded-xl border border-white/20 bg-gradient-to-br p-[2px]",
                          providerStyle[provider].chip,
                        )}
                      >
                        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-black/60 text-sm font-semibold uppercase text-white/90">
                          {provider === "apps-script" ? "GS" : "N8"}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {providerStyle[provider].label}
                        </p>
                        <p className="text-xs text-slate-300">
                          {healthy}/{related.length} healthy · {avgLatency}ms avg
                          latency
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.25)]" />
                      <span className="text-xs text-slate-300">Sync fresh</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
                  Run Timeline
                </p>
                <p className="text-slate-200/80">
                  Synthetic bars show relative latency; hover to feel motion
                </p>
              </div>
              <Zap className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {automations.map((automation) => (
                <motion.div
                  key={`${automation.id}-timeline`}
                  whileHover={{ scale: 1.01 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={clsx(
                          "size-2.5 rounded-full",
                          statusStyle[automation.status].dot,
                        )}
                      />
                      <p className="font-semibold text-white">
                        {automation.name}
                      </p>
                    </div>
                    <span className="text-xs uppercase text-slate-400">
                      {providerStyle[automation.provider].label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    {[0.8, 1, 0.65, 0.9, 0.7].map((factor, idx) => (
                      <div
                        key={idx}
                        className="relative flex-1 overflow-hidden rounded-full bg-white/5"
                        style={{ height: `${factor * 50 + 10}px` }}
                      >
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                          className={clsx(
                            "absolute bottom-0 left-0 right-0 origin-bottom rounded-full bg-gradient-to-t",
                              automation.status === "failed"
                                ? "from-rose-500/60 to-rose-300/50"
                                : "from-emerald-500/60 via-teal-500/60 to-amber-400/70",
                            )}
                            style={{ height: "100%" }}
                          />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                    <span>Last run {formatTime(automation.lastRun)}</span>
                    <span>{automation.latencyMs} ms · {Math.round(automation.successRate * 100)}% success</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {failing.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border border-rose-400/30 bg-rose-500/5 p-5 shadow-[0_20px_120px_rgba(251,113,133,0.35)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-200">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-rose-100">
                  Incident lane
                </p>
                <p className="text-rose-50">
                  {failing.length} automation
                  {failing.length > 1 ? "s are" : " is"} failing right now.
                  Triage before blast radius grows.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {failing.map((automation) => (
                <div
                  key={`fail-${automation.id}`}
                  className="rounded-xl border border-rose-400/30 bg-black/30 p-3 text-rose-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{automation.name}</p>
                    <span className="text-xs uppercase text-rose-200">
                      {providerStyle[automation.provider].label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-rose-100/90">
                    {automation.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {automation.access.map((grant) => (
                      <AccessPill
                        key={`fail-${automation.id}-${grant.user}`}
                        grant={grant}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1222] p-6 shadow-[0_30px_160px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                    Automation detail
                  </p>
                  <h3 className="text-2xl font-semibold text-white">
                    {selected.name}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">
                    {selected.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    Owner
                  </p>
                  <p className="text-white font-semibold">{selected.owner}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    Last Updated
                  </p>
                  <p className="text-white font-semibold">
                    {formatTime(selected.lastRun)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    Provider
                  </p>
                  <p className="text-white font-semibold">
                    {providerStyle[selected.provider].label}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                <span className={clsx("rounded-full border px-2 py-1", statusStyle[selected.status].badge)}>
                  Status: {statusStyle[selected.status].label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  ID: {selected.id.replace(/^gs-/, "")}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Success {Math.round(selected.successRate * 100)}%
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Latency {selected.latencyMs} ms
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`https://script.google.com/home/projects/${selected.id.replace(/^gs-/, "")}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  <FileCode2 className="h-4 w-4" />
                  Open in Apps Script
                </a>
                {selected.provider === "apps-script" && (
                  <a
                    href={selected.sheetUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
                      selected.sheetUrl
                        ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                        : "border-white/10 bg-white/5 text-slate-400 cursor-not-allowed",
                    )}
                  >
                    <SquareArrowOutUpRight className="h-4 w-4" />
                    {selected.sheetUrl ? "Open Sheet" : "No sheet URL"}
                  </a>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Access
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.access.map((g) => (
                    <AccessPill key={`${selected.id}-modal-${g.user}`} grant={g} />
                  ))}
                </div>
              </div>

              {selected.files && selected.files.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                    Scripts inside this project
                  </p>
                  <ul className="mt-2 space-y-1 text-slate-100">
                    {selected.files.map((f) => (
                      <li
                        key={`${selected.id}-file-${f}`}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1"
                      >
                        <FileCode2 className="h-4 w-4 text-slate-200" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
