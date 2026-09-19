import "server-only";

/**
 * =====================================================================
 * Local Store — a zero-dependency, Firestore-compatible persistence layer
 * =====================================================================
 * The platform was written against the Firebase Admin SDK API surface
 * (collection/doc/where/orderBy/limit/startAfter/get/set/add/delete/count/
 * runTransaction/FieldValue). This module implements that same surface on
 * top of an embedded SQLite database, so the entire application — public
 * site, admin studio and owner console — runs with no external services
 * when Firebase credentials are not supplied.
 *
 * Storage model
 * -------------
 *   documents(collection, id, data JSON, created_at, updated_at)
 *   meta(key, value)   -> counters, schema version
 *
 * Documents keep Firestore-ish value semantics: Date/Timestamp round-trip
 * as Timestamp objects with toDate(), so every consumer in the codebase
 * (toISODate, formatDate, …) works unchanged.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { FieldValue as FsFieldValue } from "firebase-admin/firestore";

/* ------------------------------------------------------------------ */
/* Storage location                                                    */
/* ------------------------------------------------------------------ */

export function getDataDir(): string {
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* read-only filesystem (e.g. serverless) — fall back to tmp */
  }
  return dir;
}

let dbInstance: DatabaseSync | null = null;

export function getSqlite(): DatabaseSync {
  if (dbInstance) return dbInstance;
  const dataDir = getDataDir();
  // Prefer the current database file; fall back to the legacy file name so
  // deployments seeded before the rebrand keep their data.
  const preferred = process.env.DATABASE_FILE ?? path.join(dataDir, "photography.db");
  const legacy = path.join(dataDir, "manup.db");
  const file = fs.existsSync(preferred) || process.env.DATABASE_FILE
    ? preferred
    : fs.existsSync(legacy)
      ? legacy
      : preferred;
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(file);
  } catch {
    db = new DatabaseSync(path.join("/tmp", "photography.db"));
  }
  try {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA busy_timeout = 8000");
    db.exec("PRAGMA foreign_keys = ON");
  } catch {
    /* pragmas are best-effort */
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      collection  TEXT NOT NULL,
      id          TEXT NOT NULL,
      data        TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT 0,
      updated_at  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents (collection);
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS credentials (
      uid            TEXT PRIMARY KEY,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      salt           TEXT NOT NULL,
      reset_token    TEXT,
      reset_expires  INTEGER,
      session_epoch  INTEGER NOT NULL DEFAULT 0,
      updated_at     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_credentials_email ON credentials (email);
  `);
  dbInstance = db;
  return db;
}

/* ------------------------------------------------------------------ */
/* Value encoding                                                      */
/* ------------------------------------------------------------------ */

export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), Math.round((ms % 1000) * 1e6));
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  isEqual(other: Timestamp): boolean {
    return this.toMillis() === other.toMillis();
  }
}

interface EncodedDate {
  __date: number;
}

function isEncodedDate(v: unknown): v is EncodedDate {
  return (
    typeof v === "object" &&
    v !== null &&
    "__date" in v &&
    typeof (v as EncodedDate).__date === "number" &&
    Object.keys(v as object).length === 1
  );
}

/** Convert in-memory values into JSON-safe storage values. */
export function encode(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { __date: value.getTime() };
  if (value instanceof Timestamp) return { __date: value.toMillis() };
  if (Array.isArray(value)) return value.map((v) => encode(v));
  if (typeof value === "object") {
    // Firestore Timestamp instances from firebase-admin
    const maybe = value as { toDate?: () => Date; toMillis?: () => number };
    if (typeof maybe.toMillis === "function" && typeof maybe.toDate === "function") {
      return { __date: maybe.toMillis() };
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = encode(v);
    }
    return out;
  }
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

/** Convert stored values back into rich in-memory values. */
export function decode(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => decode(v));
  if (isEncodedDate(value)) return Timestamp.fromMillis(value.__date);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = decode(v);
    }
    return out;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* FieldValue sentinels (ours + firebase-admin's)                      */
/* ------------------------------------------------------------------ */

const SENTINEL = "__local_field_value";

export interface FieldSentinel {
  [SENTINEL]: true;
  op: "serverTimestamp" | "increment" | "arrayUnion" | "arrayRemove" | "delete";
  operand?: unknown;
}

function sentinel(op: FieldSentinel["op"], operand?: unknown): FieldSentinel {
  return { [SENTINEL]: true, op, operand };
}

function isSentinel(v: unknown): v is FieldSentinel {
  return typeof v === "object" && v !== null && (v as FieldSentinel)[SENTINEL] === true;
}

/** Detect sentinels created by firebase-admin's FieldValue class.
 *  Handles both old (`_methodName`/`_operand`) and current
 *  (ServerTimestampTransform/NumericIncrementTransform/…) internals. */
function fromFirebaseFieldValue(v: unknown): FieldSentinel | null {
  if (!(v instanceof FsFieldValue)) return null;
  const internal = v as unknown as {
    _methodName?: string;
    _operand?: unknown;
    _elements?: unknown[];
    operand?: unknown;
    elements?: unknown[];
  };
  const name =
    internal._methodName ?? Object.getPrototypeOf(v)?.constructor?.name ?? "";
  const operand = internal._operand ?? internal.operand;
  const elements = internal._elements ?? internal.elements;
  if (name === "serverTimestamp" || name === "ServerTimestampTransform") {
    return sentinel("serverTimestamp");
  }
  if (name === "increment" || name === "NumericIncrementTransform") {
    return sentinel("increment", Number(operand ?? 0));
  }
  if (name === "arrayUnion" || name === "ArrayUnionTransform") {
    return sentinel("arrayUnion", elements ?? []);
  }
  if (name === "arrayRemove" || name === "ArrayRemoveTransform") {
    return sentinel("arrayRemove", elements ?? []);
  }
  if (name === "delete" || name === "DeleteTransform") {
    return sentinel("delete");
  }
  return null;
}

export const LocalFieldValue = {
  serverTimestamp: () => sentinel("serverTimestamp"),
  increment: (n: number) => sentinel("increment", n),
  arrayUnion: (...elements: unknown[]) => sentinel("arrayUnion", elements),
  arrayRemove: (...elements: unknown[]) => sentinel("arrayRemove", elements),
  delete: () => sentinel("delete"),
};

/* ------------------------------------------------------------------ */
/* Merge / write semantics                                             */
/* ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !(v instanceof Timestamp) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

type DeepPartial<T> = { [K in keyof T]?: unknown };

/** Firestore-style merge: nested maps merge, arrays/scalars replace. */
function merge(existing: unknown, patch: unknown, replacing: boolean): unknown {
  const fbSentinel = fromFirebaseFieldValue(patch);
  const eff = fbSentinel ?? patch;

  if (isSentinel(eff)) {
    switch (eff.op) {
      case "serverTimestamp":
        return Timestamp.now();
      case "increment":
        return (typeof existing === "number" ? existing : 0) + Number(eff.operand ?? 0);
      case "arrayUnion": {
        const base = Array.isArray(existing) ? (existing as unknown[]) : [];
        const add = (eff.operand as unknown[]) ?? [];
        const out = [...base];
        for (const item of add) {
          const enc = JSON.stringify(encode(item));
          if (!out.some((x) => JSON.stringify(encode(x)) === enc)) out.push(item);
        }
        return out;
      }
      case "arrayRemove": {
        const base = Array.isArray(existing) ? (existing as unknown[]) : [];
        const remove = (eff.operand as unknown[]) ?? [];
        return base.filter(
          (x) =>
            !remove.some((r) => JSON.stringify(encode(r)) === JSON.stringify(encode(x)))
        );
      }
      case "delete":
        return undefined;
      default:
        return existing;
    }
  }

  if (isPlainObject(fbSentinel as object) && isSentinel(fbSentinel)) return merge(existing, fbSentinel, replacing);
  if (!isPlainObject(eff)) return eff;

  const base: Record<string, unknown> =
    !replacing && isPlainObject(existing) ? { ...(existing as Record<string, unknown>) } : {};

  for (const [k, v] of Object.entries(eff as Record<string, unknown>)) {
    const merged = merge(base[k], v, false);
    if (merged === undefined && isSentinelOrDelete(v)) {
      delete base[k];
    } else if (merged === undefined) {
      base[k] = undefined;
      delete base[k];
    } else {
      base[k] = merged;
    }
  }
  return base;
}

function isSentinelOrDelete(v: unknown): boolean {
  const eff = fromFirebaseFieldValue(v) ?? v;
  return isSentinel(eff) && eff.op === "delete";
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "not-in" | "array-contains" | "array-contains-any";

function comparable(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  if (typeof v === "object") {
    const t = v as { toMillis?: () => number; toDate?: () => Date };
    if (typeof t.toMillis === "function") return t.toMillis();
    if (typeof t.toDate === "function") return t.toDate().getTime();
  }
  return JSON.stringify(encode(v));
}

function compareValues(a: unknown, b: unknown): number {
  const av = comparable(a);
  const bv = comparable(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1; // missing values sort last, like Firestore
  if (bv === null) return -1;
  if (typeRank(av) !== typeRank(bv)) return typeRank(av) - typeRank(bv);
  if (typeof av === "string" && typeof bv === "string") return av < bv ? -1 : av > bv ? 1 : 0;
  if (typeof av === "boolean" && typeof bv === "boolean") return av === bv ? 0 : av ? 1 : -1;
  return (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0;
}

function typeRank(v: unknown): number {
  if (v === null) return 0;
  if (typeof v === "boolean") return 1;
  if (typeof v === "number") return 2;
  if (typeof v === "string") return 3;
  return 4;
}

function matches(doc: Record<string, unknown>, field: string, op: WhereOp, value: unknown): boolean {
  const current = doc[field];
  const inList = Array.isArray(value) ? value : [value];
  switch (op) {
    case "==":
      return compareValues(current, value) === 0;
    case "!=":
      return compareValues(current, value) !== 0;
    case "<":
      return current !== undefined && comparable(current) !== null && compareValues(current, value) < 0;
    case "<=":
      return current !== undefined && comparable(current) !== null && compareValues(current, value) <= 0;
    case ">":
      return current !== undefined && comparable(current) !== null && compareValues(current, value) > 0;
    case ">=":
      return current !== undefined && comparable(current) !== null && compareValues(current, value) >= 0;
    case "in":
      return inList.some((v) => compareValues(current, v) === 0);
    case "not-in":
      return !inList.some((v) => compareValues(current, v) === 0);
    case "array-contains":
      return Array.isArray(current) && current.some((v) => compareValues(v, value) === 0);
    case "array-contains-any":
      return Array.isArray(current) && current.some((v) => inList.some((w) => compareValues(v, w) === 0));
    default:
      return false;
  }
}

function randomId(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/* ------------------------------------------------------------------ */
/* Snapshots & references                                              */
/* ------------------------------------------------------------------ */

export interface LocalDocSnapshot {
  id: string;
  exists: boolean;
  ref: LocalDocumentReference;
  data: () => Record<string, unknown> | undefined;
  get: (field: string) => unknown;
}

export interface LocalQuerySnapshot {
  docs: LocalDocSnapshot[];
  size: number;
  empty: boolean;
  forEach: (cb: (doc: LocalDocSnapshot) => void) => void;
}

type Listener = () => void;

export class LocalDocumentReference {
  constructor(
    public readonly collectionName: string,
    public readonly docId: string
  ) {}

  get id(): string {
    return this.docId;
  }

  get path(): string {
    return `${this.collectionName}/${this.docId}`;
  }

  private read(): { data: Record<string, unknown>; createdAt: number; updatedAt: number } | null {
    const db = getSqlite();
    const row = db
      .prepare("SELECT data, created_at, updated_at FROM documents WHERE collection = ? AND id = ?")
      .get(this.collectionName, this.docId) as
      | { data: string; created_at: number; updated_at: number }
      | undefined;
    if (!row) return null;
    try {
      return {
        data: decode(JSON.parse(row.data)) as Record<string, unknown>,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return { data: {}, createdAt: row.created_at, updatedAt: row.updated_at };
    }
  }

  async get(): Promise<LocalDocSnapshot> {
    const row = this.read();
    return {
      id: this.docId,
      exists: row !== null,
      ref: this,
      data: () => row?.data,
      get: (field: string) => row?.data?.[field],
    };
  }

  async set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void> {
    const existing = this.read();
    const mergeMode = options?.merge === true;
    let next: Record<string, unknown>;
    if (mergeMode && existing) {
      next = (merge(existing.data, data, false) as Record<string, unknown>) ?? {};
    } else {
      next = (merge(undefined, data, true) as Record<string, unknown>) ?? {};
    }
    const now = Date.now();
    const createdAt = existing?.createdAt ?? now;
    const encoded = JSON.stringify(encode(next));
    getSqlite()
      .prepare(
        `INSERT INTO documents (collection, id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .run(this.collectionName, this.docId, encoded, createdAt, now);
    notify();
  }

  async create(data: Record<string, unknown>): Promise<void> {
    if (this.read()) {
      throw new Error(`Document ${this.path} already exists`);
    }
    await this.set(data);
  }

  async update(data: Record<string, unknown>): Promise<void> {
    const existing = this.read();
    if (!existing) throw new Error(`Document ${this.path} not found`);
    await this.set(data, { merge: true });
  }

  async delete(): Promise<void> {
    getSqlite()
      .prepare("DELETE FROM documents WHERE collection = ? AND id = ?")
      .run(this.collectionName, this.docId);
    notify();
  }

  /** ref.onSnapshot — used by the browser-style live hooks. */
  onSnapshot(cb: (snap: LocalDocSnapshot) => void): () => void {
    const push = () => void this.get().then(cb);
    const off = subscribe(push);
    push();
    return off;
  }
}

export class LocalQuery {
  constructor(
    private readonly collectionName: string,
    private readonly filters: { field: string; op: WhereOp; value: unknown }[] = [],
    private readonly orders: { field: string; dir: "asc" | "desc" }[] = [],
    private readonly max: number | null = null,
    private readonly afterId: string | null = null
  ) {}

  private clone(patch: Partial<{
    filters: { field: string; op: WhereOp; value: unknown }[];
    orders: { field: string; dir: "asc" | "desc" }[];
    max: number | null;
    afterId: string | null;
  }>): LocalQuery {
    return new LocalQuery(
      this.collectionName,
      patch.filters ?? this.filters,
      patch.orders ?? this.orders,
      patch.max === undefined ? this.max : patch.max,
      patch.afterId === undefined ? this.afterId : patch.afterId
    );
  }

  where(field: string, op: WhereOp, value: unknown): LocalQuery {
    return this.clone({ filters: [...this.filters, { field, op, value }] });
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): LocalQuery {
    return this.clone({ orders: [...this.orders, { field, dir }] });
  }

  limit(n: number): LocalQuery {
    return this.clone({ max: n });
  }

  offset(n: number): LocalQuery {
    return this.limit(n);
  }

  startAfter(cursor: LocalDocSnapshot | LocalDocumentReference | string | unknown[]): LocalQuery {
    if (typeof cursor === "string") return this.clone({ afterId: cursor });
    if (cursor && typeof cursor === "object" && "id" in (cursor as object) && "exists" in (cursor as object)) {
      return this.clone({ afterId: (cursor as LocalDocSnapshot).id });
    }
    if (cursor && typeof cursor === "object" && "docId" in (cursor as object)) {
      return this.clone({ afterId: (cursor as LocalDocumentReference).docId });
    }
    return this;
  }

  startAt(cursor: LocalDocSnapshot | string): LocalQuery {
    return this.startAfter(cursor);
  }

  private run(): LocalDocSnapshot[] {
    const db = getSqlite();
    const rows = db
      .prepare("SELECT id, data FROM documents WHERE collection = ?")
      .all(this.collectionName) as { id: string; data: string }[];

    let docs: { id: string; data: Record<string, unknown> }[] = rows.map((row) => {
      let data: Record<string, unknown> = {};
      try {
        data = decode(JSON.parse(row.data)) as Record<string, unknown>;
      } catch {
        data = {};
      }
      return { id: row.id, data };
    });

    for (const f of this.filters) {
      docs = docs.filter((d) => matches(d.data, f.field, f.op, f.value));
    }

    if (this.orders.length) {
      docs.sort((a, b) => {
        for (const o of this.orders) {
          const cmp = compareValues(a.data[o.field], b.data[o.field]);
          if (cmp !== 0) return o.dir === "desc" ? -cmp : cmp;
        }
        return 0;
      });
    } else {
      docs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }

    if (this.afterId) {
      const idx = docs.findIndex((d) => d.id === this.afterId);
      if (idx >= 0) docs = docs.slice(idx + 1);
    }

    if (this.max !== null) docs = docs.slice(0, this.max);

    return docs.map((d) => {
      const ref = new LocalDocumentReference(this.collectionName, d.id);
      return {
        id: d.id,
        exists: true,
        ref,
        data: () => d.data,
        get: (field: string) => d.data[field],
      };
    });
  }

  async get(): Promise<LocalQuerySnapshot> {
    const docs = this.run();
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (cb) => docs.forEach(cb),
    };
  }

  count(): { get: () => Promise<{ data: () => { count: number } }> } {
    return {
      get: async () => {
        const docs = this.run();
        return { data: () => ({ count: docs.length }) };
      },
    };
  }

  onSnapshot(cb: (snap: LocalQuerySnapshot) => void): () => void {
    const push = () => void this.get().then(cb);
    const off = subscribe(push);
    push();
    return off;
  }
}

export class LocalCollectionReference extends LocalQuery {
  constructor(public readonly name: string) {
    super(name);
  }

  get path(): string {
    return this.name;
  }

  doc(id?: string): LocalDocumentReference {
    return new LocalDocumentReference(this.name, id ?? randomId());
  }

  /** Firestore Admin returns a DocumentReference; awaited by callers. */
  async add(data: Record<string, unknown>): Promise<LocalDocumentReference> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

/* ------------------------------------------------------------------ */
/* Transactions & batches                                              */
/* ------------------------------------------------------------------ */

export interface LocalTransaction {
  get: (target: LocalDocumentReference | LocalQuery) => Promise<unknown>;
  set: (target: LocalDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }) => void;
  update: (target: LocalDocumentReference, data: Record<string, unknown>) => void;
  delete: (target: LocalDocumentReference) => void;
}

let mutex: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = mutex.then(fn, fn);
  mutex = run.catch(() => undefined);
  return run;
}

/** Simple, dependency-free transaction: operations commit when the callback resolves. */
export class LocalFirestore {
  collection(name: string): LocalCollectionReference {
    return new LocalCollectionReference(name);
  }

  doc(path: string): LocalDocumentReference {
    const [collection, id] = path.split("/");
    return new LocalDocumentReference(collection, id);
  }

  async runTransaction<T>(fn: (tx: LocalTransaction) => Promise<T>): Promise<T> {
    return withLock(async () => {
      const staged: (() => Promise<void>)[] = [];
      const tx: LocalTransaction = {
        get: async (target) => {
          if (target instanceof LocalDocumentReference) return target.get();
          return (target as LocalQuery).get();
        },
        set: (target, data, options) => {
          staged.push(() => target.set(data, options));
        },
        update: (target, data) => {
          staged.push(() => target.update(data));
        },
        delete: (target) => {
          staged.push(() => target.delete());
        },
      };
      const result = await fn(tx);
      for (const op of staged) await op();
      return result;
    });
  }

  batch() {
    const ops: (() => Promise<unknown>)[] = [];
    return {
      set: (ref: LocalDocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }) =>
        ops.push(() => ref.set(data, options)),
      update: (ref: LocalDocumentReference, data: Record<string, unknown>) =>
        ops.push(() => ref.update(data)),
      delete: (ref: LocalDocumentReference) => ops.push(() => ref.delete()),
      create: (ref: LocalDocumentReference, data: Record<string, unknown>) =>
        ops.push(() => ref.create(data)),
      commit: async () => {
        for (const op of ops) await op();
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/* Change notifications (powering live-refresh in the studio)          */
/* ------------------------------------------------------------------ */

const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* listener errors must never break a write */
    }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Raw helpers used by credentials / seeding / maintenance utilities   */
/* ------------------------------------------------------------------ */

export function metaGet(key: string): string | null {
  const row = getSqlite().prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function metaSet(key: string, value: string): void {
  getSqlite()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export async function countDocuments(collection: string): Promise<number> {
  const db = getSqlite();
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM documents WHERE collection = ?")
    .get(collection) as { c: number } | undefined;
  return Number(row?.c ?? 0);
}

export function listCollections(): { collection: string; count: number }[] {
  const rows = getSqlite()
    .prepare("SELECT collection, COUNT(*) AS c FROM documents GROUP BY collection ORDER BY collection")
    .all() as { collection: string; c: number }[];
  return rows.map((r) => ({ collection: r.collection, count: Number(r.c) }));
}
