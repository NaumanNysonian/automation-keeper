import clsx from "clsx";
import { Clock, Shield } from "lucide-react";
import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";

type Status = "healthy" | "degraded" | "failed" | "paused";
type Lifecycle = "active" | "inactive" | "dead";

interface Workflow {
  id: string;
  name: string;
  owner: string;
  status: Status;
  lastRun: string;
  latencyMs: number;
  successRate: number;
  lifecycle: Lifecycle;
  tags: string[];
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

function deriveLifecycle(lastRun: string): Lifecycle {
  const diffMinutes =
    (Date.now() - new Date(lastRun || new Date().toISOString()).getTime()) /
    60000;
  if (diffMinutes <= 40) return "active";
  if (diffMinutes <= 60 * 24 * 2) return "inactive";
  return "dead";
}

async function loadWorkflows(): Promise<Workflow[]> {
  const n8nPath = path.join(process.cwd(), ".data", "n8n.json");
  const raw = await fs.readFile(n8nPath, "utf8").catch(() => "[]");
  const items: unknown[] = JSON.parse(raw);
  return items.map((item) => {
    const w = item as {
      id?: string;
      name?: string;
      owner?: string;
      status?: string;
      createdAt?: string;
      created_at?: string;
      updatedAt?: string;
      updated_at?: string;
      notes?: string;
      tags?: string[];
    };
    const status =
      w.status === "failed"
        ? "failed"
        : w.status === "paused" || w.status === "inactive"
          ? "paused"
          : "healthy";
    const lastRun = w.updatedAt || w.createdAt || new Date().toISOString();
    return {
      id: `n8n-${w.id}`,
      name: w.name || "Untitled workflow",
      owner: w.owner || "Unknown",
      status,
      lastRun,
      latencyMs: 420,
      successRate: 0.99,
      lifecycle: deriveLifecycle(lastRun),
      tags: Array.isArray(w.tags) ? w.tags : [],
      notes: w.notes || "",
    };
  });
}

export default async function WorkflowsPage() {
  const workflows = await loadWorkflows();

  return (
    <div className="min-h-screen bg-[#04070b] text-slate-50 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            n8n Workflows
          </p>
          <h1 className="text-3xl font-semibold text-white">All Workflows</h1>
          <p className="text-slate-300">
            Everything ingested from n8n. Live-updated via /api/ingest/n8n.
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
        {workflows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-300">
            No workflows ingested yet. POST to /api/ingest/n8n to populate.
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              className={clsx(
                "rounded-xl border border-white/10 bg-gradient-to-r p-4 shadow-[0_10px_80px_rgba(0,0,0,0.45)]",
                "from-zinc-800/70 via-zinc-900/60 to-black/60",
                statusStyle[wf.status].glow,
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-white">{wf.name}</p>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-tight",
                        statusStyle[wf.status].badge,
                      )}
                    >
                      <span
                        className={clsx(
                          "size-2.5 rounded-full",
                          statusStyle[wf.status].dot,
                        )}
                      />
                      {statusStyle[wf.status].label}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-tight text-slate-200/90">
                      {wf.lifecycle}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {wf.notes || "n8n workflow"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                    {wf.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-tight text-slate-200/90"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-200 md:items-end">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-xs uppercase text-slate-400">
                      Last update
                    </span>
                    <span className="font-semibold">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(wf.lastRun))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                      <Shield className="h-4 w-4 text-emerald-300" />
                      <span>{Math.round(wf.successRate * 100)}% success</span>
                    </div>
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
