import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ID_RE } from "../text";
import { createDocStore, type Doc, type DocBackend } from "./doc";
import type { Store } from "./types";

/**
 * Local development store: `<dir>/twopick.json` (re-read on every access) + `<dir>/images/<id>`
 * (each image file holds its data URL). Writes go through the doc-store mutex and are atomic
 * (temp file + rename, with retries for Windows/OneDrive file locks).
 */

function errnoCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES", "EEXIST"]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeAtomic(target: string, content: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, content, "utf8");
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(tmp, target);
      return;
    } catch (err) {
      if (attempt < 8 && RETRYABLE.has(errnoCode(err) ?? "")) {
        await sleep(25 * (attempt + 1));
        continue;
      }
      // Last resort (e.g. a sync client keeps the target locked): write in place.
      try {
        await writeFile(target, content, "utf8");
      } finally {
        await rm(tmp, { force: true }).catch(() => undefined);
      }
      return;
    }
  }
}

export function createFileStore(dir: string): Store {
  const dataFile = path.join(/*turbopackIgnore: true*/ dir, "twopick.json");
  const imagesDir = path.join(/*turbopackIgnore: true*/ dir, "images");

  function imagePath(id: string): string {
    if (!ID_RE.test(id)) throw new Error(`invalid image id: ${id}`);
    return path.join(/*turbopackIgnore: true*/ imagesDir, id);
  }

  const backend: DocBackend = {
    kind: "file",

    async load() {
      let text: string;
      try {
        text = await readFile(dataFile, "utf8");
      } catch (err) {
        if (errnoCode(err) === "ENOENT") return null;
        throw err;
      }
      if (!text.trim()) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        // Never silently discard data: make the problem loud and leave the file untouched.
        throw new Error(`[twopick] ${dataFile} is not valid JSON — fix or delete it, then retry.`);
      }
    },

    save: (doc: Doc) => writeAtomic(dataFile, JSON.stringify(doc, null, 2)),

    async readImage(id) {
      if (!ID_RE.test(id)) return null;
      try {
        return await readFile(imagePath(id), "utf8");
      } catch (err) {
        if (errnoCode(err) === "ENOENT") return null;
        throw err;
      }
    },

    async writeImage(id, dataUrl) {
      await mkdir(imagesDir, { recursive: true });
      await writeFile(imagePath(id), dataUrl, "utf8");
    },

    async deleteImage(id) {
      if (!ID_RE.test(id)) return;
      await rm(imagePath(id), { force: true });
    },

    async clearImages() {
      await rm(imagesDir, { recursive: true, force: true });
    },
  };

  return createDocStore(backend, `file:${dataFile}`);
}
