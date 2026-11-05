"use client";

import type { TokenPair } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

const ACCESS_KEY = "nba.accessToken";
const REFRESH_KEY = "nba.refreshToken";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ----------------------------------------------------------------- token store

function storageGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) – tokens stay in memory only */
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  accessToken = storageGet(ACCESS_KEY);
  refreshToken = storageGet(REFRESH_KEY);
  loaded = true;
}

type Listener = () => void;
const sessionListeners = new Set<Listener>();

/** Called when the session ends unexpectedly (refresh failed or reused). */
export function onSessionExpired(fn: Listener): () => void {
  sessionListeners.add(fn);
  return () => {
    sessionListeners.delete(fn);
  };
}

export const tokens = {
  get access() {
    load();
    return accessToken;
  },
  get refresh() {
    load();
    return refreshToken;
  },
  set(pair: Pick<TokenPair, "accessToken" | "refreshToken">) {
    accessToken = pair.accessToken;
    refreshToken = pair.refreshToken;
    loaded = true;
    storageSet(ACCESS_KEY, accessToken);
    storageSet(REFRESH_KEY, refreshToken);
  },
  clear() {
    accessToken = null;
    refreshToken = null;
    loaded = true;
    storageSet(ACCESS_KEY, null);
    storageSet(REFRESH_KEY, null);
  },
};

// Refresh tokens are single-use, so concurrent 401s must share one refresh call.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const rt = tokens.refresh;
  if (!rt) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) {
          tokens.clear();
          sessionListeners.forEach((fn) => fn());
          return false;
        }
        tokens.set((await res.json()) as TokenPair);
        return true;
      } catch {
        return false; // network error: keep tokens, let the caller surface the failure
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

// ----------------------------------------------------------------- request

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** Attach the bearer token when available (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { error?: { code?: string; message?: string; details?: unknown; requestId?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  const e = body?.error;
  return new ApiError(
    res.status,
    e?.code ?? "ERROR",
    e?.message ?? `Request failed (${res.status})`,
    e?.details,
    e?.requestId ?? res.headers.get("x-request-id") ?? undefined,
  );
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, auth = true, signal } = opts;

  const doFetch = () => {
    const h: Record<string, string> = { Accept: "application/json", ...headers };
    if (body !== undefined) h["Content-Type"] = "application/json";
    if (auth && tokens.access) h.Authorization = `Bearer ${tokens.access}`;
    return fetch(buildUrl(path, query), {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && auth && tokens.refresh) {
    if (await refreshSession()) {
      try {
        res = await doFetch();
      } catch {
        throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server. Check your connection and try again.");
      }
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Human-friendly message for any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details) && err.details.length) {
      const first = err.details[0] as { path?: string; message?: string };
      return first.path ? `${first.path}: ${first.message}` : (first.message ?? err.message);
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
