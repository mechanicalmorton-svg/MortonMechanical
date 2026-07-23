import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const LOGS_DIR = path.join(DATA_DIR, "logs");

for (const dir of [DATA_DIR, LOGS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(name: string, fallback: T): T {
  const file = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  const file = path.join(DATA_DIR, name);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

export function appendLog(name: string, entry: unknown) {
  fs.appendFileSync(path.join(LOGS_DIR, name), JSON.stringify(entry) + "\n");
}

export function readLog<T>(name: string, limit = 500): T[] {
  const file = path.join(LOGS_DIR, name);
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    const out: T[] = [];
    for (const line of lines.slice(-limit)) {
      try { out.push(JSON.parse(line)); } catch { /* skip */ }
    }
    return out.reverse();
  } catch {
    return [];
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
