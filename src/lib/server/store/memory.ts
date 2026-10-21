import "server-only";
import { createDocStore, type Doc, type DocBackend } from "./doc";
import type { Store } from "./types";

/**
 * Last-resort store (Vercel without Redis): lives in `globalThis`, so it survives dev hot reloads
 * but NOT server restarts, and is not shared between serverless instances. Admin shows a danger warning.
 */

interface MemoryState {
  doc: Doc | null;
  images: Map<string, string>;
}

function state(): MemoryState {
  const g = globalThis as typeof globalThis & { __twopickMemory?: MemoryState };
  g.__twopickMemory ??= { doc: null, images: new Map() };
  return g.__twopickMemory;
}

export function createMemoryStore(): Store {
  const backend: DocBackend = {
    kind: "memory",
    // Clones keep the stored document immutable until a mutation commits via save().
    load: async () => {
      const { doc } = state();
      return doc ? structuredClone(doc) : null;
    },
    save: async (doc) => {
      state().doc = structuredClone(doc);
    },
    readImage: async (id) => state().images.get(id) ?? null,
    writeImage: async (id, dataUrl) => {
      state().images.set(id, dataUrl);
    },
    deleteImage: async (id) => {
      state().images.delete(id);
    },
    clearImages: async () => {
      state().images.clear();
    },
  };
  return createDocStore(backend, "memory");
}
