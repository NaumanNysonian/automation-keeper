import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const DATA_DIR = path.join(process.cwd(), ".data");
const N8N_FILE = path.join(DATA_DIR, "n8n.json");
const N8N_CSV = path.join(DATA_DIR, "n8n.csv");

export const dynamic = "force-dynamic";

type WorkflowRecord = {
  id: string;
  name?: string;
  owner?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  notes?: string;
  tags?: string[];
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workflows: WorkflowRecord[] = Array.isArray(body.workflows)
      ? body.workflows
      : Array.isArray(body)
        ? body
        : [];
    if (!workflows.length) {
      return NextResponse.json(
        { error: "Body must include workflows array" },
        { status: 400 },
      );
    }

    await ensureDir();
    const existingRaw = await fs.readFile(N8N_FILE, "utf8").catch(() => "[]");
    const existing: WorkflowRecord[] = JSON.parse(existingRaw);
    const merged = new Map<string, WorkflowRecord>();
    const upsert = (w: WorkflowRecord) => {
      if (w && typeof w.id === "string") {
        merged.set(w.id, w);
      }
    };
    existing.forEach(upsert);
    workflows.forEach(upsert);
    const mergedArr = Array.from(merged.values());

    await fs.writeFile(N8N_FILE, JSON.stringify(mergedArr, null, 2), "utf8");

    const headers = ["id", "name", "owner", "status", "createdAt", "updatedAt"];
    const lines = [
      headers.join(","),
      ...mergedArr.map((m) =>
        [
          m.id,
          m.name ?? "",
          m.owner ?? "",
          m.status ?? "",
          m.createdAt ? new Date(m.createdAt).toISOString() : "",
          m.updatedAt ? new Date(m.updatedAt).toISOString() : "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    await fs.writeFile(N8N_CSV, lines.join("\n"), "utf8");

    return NextResponse.json({ stored: mergedArr.length, added: workflows.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to ingest n8n data" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const data = await fs.readFile(N8N_FILE, "utf8").catch(() => "[]");
    return NextResponse.json({ workflows: JSON.parse(data) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read n8n data" },
      { status: 500 },
    );
  }
}
