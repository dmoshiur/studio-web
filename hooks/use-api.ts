"use client";

import * as React from "react";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

interface ListState<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
  removeItem: (id: string) => void;
}

/** Paginated list hook for admin/owner tables (cursor-based). */
export function usePaginatedList<T extends { id: string }>(
  basePath: string,
  params?: Record<string, string | undefined>,
  limit = 20
): ListState<T> {
  const [items, setItems] = React.useState<T[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const paramsKey = JSON.stringify(params ?? {});

  const buildUrl = React.useCallback(
    (after?: string | null) => {
      const url = new URL(basePath, window.location.origin);
      url.searchParams.set("limit", String(limit));
      const p = JSON.parse(paramsKey) as Record<string, string | undefined>;
      for (const [k, v] of Object.entries(p)) {
        if (v) url.searchParams.set(k, v);
      }
      if (after) url.searchParams.set("cursor", after);
      return url.toString();
    },
    [basePath, limit, paramsKey]
  );

  const load = React.useCallback(
    async (after?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await api<{ items: T[]; nextCursor: string | null }>(buildUrl(after));
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildUrl]
  );

  React.useEffect(() => {
    void load(null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, basePath]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: cursor !== null,
    loadMore: () => cursor && load(cursor, true),
    reload: () => load(null, false),
    removeItem: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
  };
}
