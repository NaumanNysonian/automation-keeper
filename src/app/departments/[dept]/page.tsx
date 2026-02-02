import Link from "next/link";
import clsx from "clsx";
import { Clock, Shield } from "lucide-react";
import { promises as fs } from "fs";
import path from "path";

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
  notes?: string;
}

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

const deptLabels: Record<string, string> = {
  operations: "Operations",
  "customer-service": "Customer Service",
  marketing: "Marketing",
};

function deriveLifecycle(lastRun: string): Lifecycle {
  const diffMinutes =
    (Date.now() - new Date(lastRun || new Date().toISOString()).getTime()) /
    60000;
  if (diffMinutes <= 40) return "active";
  if (diffMinutes <= 60 * 24 * 2) return "inactive"; // >40 mins and <= 48h
  return "dead"; // > 48h
}

async function loadAutomations(): Promise<Automation[]> {
  const appPath = path.join(process.cwd(), ".data", "apps-script.json");
  const n8nPath = path.join(process.cwd(), ".data", "n8n.json");
  const appRaw = await fs.readFile(appPath, "utf8").catch(() => "[]");
  const n8nRaw = await fs.readFile(n8nPath, "utf8").catch(() => "[]");
  const items: unknown[] = [...JSON.parse(appRaw), ...JSON.parse(n8nRaw)];
  return items.map((item) => {
    const rec = item as {
      id?: string;
      name?: string;
      owner?: string;
      deployments?: { description?: string }[];
      updatedAt?: string;
      createdAt?: string;
      sheetUrl?: string | null;
      files?: string[];
      department?: string;
      tags?: string[];
      provider?: string;
      status?: string;
      notes?: string;
    };
    const provider = rec.provider === "n8n" ? "n8n" : "apps-script";
    const status =
      rec.status === "failed"
        ? "failed"
        : rec.status === "paused" || rec.status === "inactive"
          ? "paused"
          : "healthy";
    return {
      id: `${provider === "n8n" ? "n8n" : "gs"}-${rec.id}`,
      name: rec.name || "Untitled script",
      provider,
      status,
      owner: rec.owner || "Unknown",
      description:
        rec.deployments?.[0]?.description ||
        rec.notes ||
        (provider === "n8n" ? "n8n workflow" : "Google Apps Script project"),
      tags:
        provider === "n8n"
          ? (rec.tags && Array.isArray(rec.tags) ? rec.tags : ["n8n"])
          : ["Apps Script"],
      lastRun: rec.updatedAt || rec.createdAt || new Date().toISOString(),
      latencyMs: 420,
      successRate: 0.99,
      sheetUrl: rec.sheetUrl ?? null,
      files: Array.isArray(rec.files)
        ? rec.files.filter((f: unknown): f is string => typeof f === "string")
        : [],
      lifecycle: deriveLifecycle(
        rec.updatedAt || rec.createdAt || new Date().toISOString(),
      ),
      department: rec.department ?? rec.tags?.[0] ?? "general",
      access: [
        {
          user: rec.owner || "Owner",
          role: "owner",
        },
      ],
    };
  });
}

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const resolved = await params;
  const slug = resolved?.dept || "general";
  const label =
    deptLabels[slug] ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const automations = (await loadAutomations()).filter((a) => {
    const needle = slug.replace("-", " ").toLowerCase();
    return (
      (a.department || "").toLowerCase().includes(needle) ||
      a.name.toLowerCase().includes(needle) ||
      a.tags.some((t) => t.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="min-h-screen bg-[#04070b] text-slate-50 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Department
          </p>
          <h1 className="text-3xl font-semibold text-white">{label}</h1>
          <p className="text-slate-300">
            Automations scoped to {label}. Filtered from ingested Apps Script
            data.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:border-white/25 hover:bg-white/10"
        >
          Back to main
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4">
        {automations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-300">
            No automations matched this department. Ingest scripts with a
            department tag to populate this view.
          </div>
        ) : (
          automations.map((automation) => (
            <div
              key={automation.id}
              className={clsx(
                "rounded-xl border border-white/10 bg-gradient-to-r p-4 shadow-[0_10px_80px_rgba(0,0,0,0.45)]",
                "from-zinc-800/70 via-zinc-900/60 to-black/60",
                statusStyle[automation.status].glow,
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold uppercase text-white border-zinc-400/30 bg-zinc-700/40">
                    {label[0]}
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
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-tight text-slate-200/90">
                        {automation.lifecycle}
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
                    <span className="font-semibold">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(automation.lastRun))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                      <Shield className="h-4 w-4 text-emerald-300" />
                      <span>{Math.round(automation.successRate * 100)}% success</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {automation.access.map((grant) => (
                      <span
                        key={`${automation.id}-${grant.user}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium"
                      >
                        <span className="size-2.5 rounded-full bg-white/70" />
                        {grant.user}
                        <span className="text-white/60">·</span>
                        <span className="uppercase tracking-tight text-[10px]">
                          {grant.role}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
