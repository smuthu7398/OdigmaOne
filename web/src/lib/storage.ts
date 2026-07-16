import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

/**
 * Storage interface — local-disk driver for now. When we move to cloud
 * storage, only this file changes (see docs/Odigma_One_Project_Guide_MySQL.md).
 * Files are ALWAYS served through the authenticated /api/v1/files/[id]
 * route, never as public static assets.
 */

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");

export type StoredFile = { fileName: string; relativePath: string };

export async function saveFile(
  buffer: Buffer,
  originalName: string
): Promise<StoredFile> {
  const now = new Date();
  const subDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ext = path.extname(originalName).slice(0, 10).toLowerCase();
  const fileName = `${randomBytes(16).toString("hex")}${ext}`;
  const dir = path.join(UPLOADS_DIR, subDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return { fileName, relativePath: `${subDir}/${fileName}` };
}

export async function readStoredFile(relativePath: string): Promise<Buffer> {
  const safe = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  return readFile(path.join(UPLOADS_DIR, safe));
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  const safe = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  try {
    await unlink(path.join(UPLOADS_DIR, safe));
  } catch {
    // already gone — fine
  }
}
