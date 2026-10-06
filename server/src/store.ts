import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal JSON-file persistence for partners, inquiries and campaigns.
// Fine for a single server instance; swap for a real database before scaling out.
const DATA_DIR = process.env.DATA_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");

export class JsonStore<T> {
  private cache: T | null = null;
  private writing: Promise<unknown> = Promise.resolve();
  private readonly file: string;

  constructor(
    name: string,
    private readonly fallback: () => T,
  ) {
    this.file = path.join(DATA_DIR, name);
  }

  async read(): Promise<T> {
    if (this.cache !== null) return this.cache;
    try {
      this.cache = JSON.parse(await readFile(this.file, "utf8")) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.cache = this.fallback();
    }
    return this.cache;
  }

  /** Mutate the value in place and persist it. Writes are serialized and atomic. */
  async update<R>(fn: (value: T) => R): Promise<R> {
    const value = await this.read();
    const result = fn(value);
    const snapshot = JSON.stringify(value, null, 2);
    this.writing = this.writing.then(async () => {
      await mkdir(DATA_DIR, { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, this.file);
    });
    await this.writing;
    return result;
  }
}
