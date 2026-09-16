/**
 * Minimal ambient types for Node's built-in SQLite module (`node:sqlite`).
 * Node 22 ships the module at runtime; @types/node may lag behind, so the
 * subset of the API used by lib/db/local-store.ts is declared here.
 */
declare module "node:sqlite" {
  export interface StatementSync {
    all(...params: unknown[]): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    iterate?(...params: unknown[]): IterableIterator<Record<string, unknown>>;
    sourceSQL?: string;
    columns?(): { name: string }[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
    allowExtension?: boolean;
    timeout?: number;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    open(): void;
    readonly isOpen: boolean;
    function(name: string, options: { deterministic?: boolean; varargs?: boolean } | undefined, fn: (...args: never[]) => unknown): void;
    createFunction(name: string, fn: (...args: never[]) => unknown): void;
    createAggregate?(name: string, options: { start: unknown; step: unknown; result?: unknown }): void;
  }

  const sqlite: { DatabaseSync: typeof DatabaseSync };
  export default sqlite;
}
