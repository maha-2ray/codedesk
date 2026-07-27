/**
 * Durable local storage for exam attempts.
 *
 * Two responsibilities, both required by the PRD's reliability goals:
 *
 *  1. **Crash recovery** — the renderer pushes an attempt snapshot on every
 *     autosave tick; if the app dies mid-exam the snapshot is replayed on
 *     restart so no answers are lost.
 *  2. **Offline outbox** — answer batches are appended here before they are
 *     sent, and only removed once the server acknowledges them, so an exam
 *     survives a network outage.
 *
 * Writes are atomic: content goes to a temporary file which is then renamed
 * over the target. A rename is atomic on both POSIX and NTFS, so a crash
 * mid-write can never leave a truncated snapshot behind.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AttemptSnapshot } from '../shared/ipc';
import type { SyncEnvelope } from '../types/answer';

/** Root directory for all attempt data, under Electron's userData path. */
function rootDir(): string {
  return path.join(app.getPath('userData'), 'attempts');
}

function snapshotDir(): string {
  return path.join(rootDir(), 'snapshots');
}

function outboxDir(): string {
  return path.join(rootDir(), 'outbox');
}

/** Prevents path traversal via a hostile attempt id. */
function safeId(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error(`Invalid attempt id: ${id}`);
  }
  return id;
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(snapshotDir(), { recursive: true });
  await fs.mkdir(outboxDir(), { recursive: true });
}

/** Writes `data` to `filePath` atomically. */
async function writeAtomic(filePath: string, data: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    // A corrupt file must not break the exam; surface it and carry on.
    console.error(`[storage] failed to read ${filePath}:`, error);
    return null;
  }
}

export async function initStorage(): Promise<void> {
  await ensureDirs();
}

export async function saveSnapshot(snapshot: AttemptSnapshot): Promise<void> {
  await ensureDirs();
  const file = path.join(snapshotDir(), `${safeId(snapshot.attemptId)}.json`);
  await writeAtomic(file, JSON.stringify(snapshot));
}

export async function loadSnapshot(
  attemptId: string,
): Promise<AttemptSnapshot | null> {
  const file = path.join(snapshotDir(), `${safeId(attemptId)}.json`);
  return readJson<AttemptSnapshot>(file);
}

export async function clearSnapshot(attemptId: string): Promise<void> {
  const file = path.join(snapshotDir(), `${safeId(attemptId)}.json`);
  await fs.rm(file, { force: true });
}

export async function listSnapshots(): Promise<AttemptSnapshot[]> {
  await ensureDirs();
  const entries = await fs.readdir(snapshotDir()).catch(() => [] as string[]);
  const snapshots: AttemptSnapshot[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const snapshot = await readJson<AttemptSnapshot>(
      path.join(snapshotDir(), entry),
    );
    if (snapshot) snapshots.push(snapshot);
  }
  return snapshots.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

/**
 * Outbox entries are one file per attempt, holding an ordered list of
 * envelopes. Keeping them per-attempt bounds file size and lets an
 * acknowledgement drop everything up to a revision in a single write.
 */
function outboxFile(attemptId: string): string {
  return path.join(outboxDir(), `${safeId(attemptId)}.json`);
}

export async function enqueueEnvelope(envelope: SyncEnvelope): Promise<void> {
  await ensureDirs();
  const file = outboxFile(envelope.attemptId);
  const existing = (await readJson<SyncEnvelope[]>(file)) ?? [];
  // Replace any queued envelope with the same revision: later autosaves for
  // the same revision supersede earlier ones.
  const merged = existing.filter((e) => e.revision !== envelope.revision);
  merged.push(envelope);
  merged.sort((a, b) => a.revision - b.revision);
  await writeAtomic(file, JSON.stringify(merged));
}

export async function drainEnvelopes(limit = 50): Promise<SyncEnvelope[]> {
  await ensureDirs();
  const entries = await fs.readdir(outboxDir()).catch(() => [] as string[]);
  const all: SyncEnvelope[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const envelopes = await readJson<SyncEnvelope[]>(
      path.join(outboxDir(), entry),
    );
    if (envelopes) all.push(...envelopes);
  }
  all.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  return all.slice(0, limit);
}

/** Drops every envelope for an attempt up to and including `revision`. */
export async function acknowledgeEnvelopes(
  attemptId: string,
  revision: number,
): Promise<void> {
  const file = outboxFile(attemptId);
  const existing = await readJson<SyncEnvelope[]>(file);
  if (!existing) return;
  const remaining = existing.filter((e) => e.revision > revision);
  if (remaining.length === 0) {
    await fs.rm(file, { force: true });
    return;
  }
  await writeAtomic(file, JSON.stringify(remaining));
}
