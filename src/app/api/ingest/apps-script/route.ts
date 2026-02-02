import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "apps-script.json");
const CSV_FILE = path.join(DATA_DIR, "apps-script.csv");
const N8N_FILE = path.join(DATA_DIR, "n8n.json");

type AutomationRecord = {
  id: string;
  name?: string;
  owner?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  sheetUrl?: string | null;
  files?: string[];
  provider?: string;
};

export const dynamic = "force-dynamic";

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.automations)) {
      return NextResponse.json(
        { error: "Body must have { automations: [...] }" },
        { status: 400 },
      );
    }
    await ensureDir();

    // Load existing automations (if any) and merge by id
    const existingRaw = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
    const existing: AutomationRecord[] = JSON.parse(existingRaw);
    const mergedMap = new Map<string, AutomationRecord>();

    const upsert = (item: unknown) => {
      const candidate = item as {
        id?: unknown;
        name?: unknown;
        owner?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
        sheetUrl?: unknown;
        files?: unknown;
      };
      if (candidate && typeof candidate.id === "string") {
        mergedMap.set(candidate.id, {
          id: candidate.id,
          name: typeof candidate.name === "string" ? candidate.name : undefined,
          owner: typeof candidate.owner === "string" ? candidate.owner : undefined,
          createdAt: candidate.createdAt as string | Date | undefined,
          updatedAt: candidate.updatedAt as string | Date | undefined,
          sheetUrl:
            typeof candidate.sheetUrl === "string" ? candidate.sheetUrl : undefined,
          files: Array.isArray(candidate.files)
            ? candidate.files
                .filter((f) => typeof f === "string")
                .map((f) => f as string)
            : undefined,
        });
      }
    };

    for (const item of existing) {
      upsert(item);
    }
    for (const item of body.automations as Record<string, unknown>[]) {
      upsert(item);
    }

    const merged = Array.from(mergedMap.values());

    await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2), {
      encoding: "utf8",
    });

    // Also write a CSV snapshot for quick viewing
    const headers = ["id", "name", "owner", "createdAt", "updatedAt", "sheetUrl"];
    const lines = [
      headers.join(","),
      ...merged.map((m) =>
        [
          m.id,
          m.name ?? "",
          m.owner ?? "",
          m.createdAt ? new Date(m.createdAt).toISOString() : "",
          m.updatedAt ? new Date(m.updatedAt).toISOString() : "",
          m.sheetUrl ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    await fs.writeFile(CSV_FILE, lines.join("\n"), { encoding: "utf8" });

    return NextResponse.json({
      stored: merged.length,
      added: body.automations.length,
      deduped: merged.length - existing.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to store data" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const appData = await fs.readFile(DATA_FILE, "utf8").catch(() => "[]");
    const n8nData = await fs.readFile(N8N_FILE, "utf8").catch(() => "[]");
    const automations = [...JSON.parse(appData), ...JSON.parse(n8nData)];
    return NextResponse.json({ automations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read data" },
      { status: 500 },
    );
  }
}
