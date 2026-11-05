"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

/**
 * The signed-in person, read from the secure session cookie (/api/auth/me).
 * Dev B's screens use this hook for "who am I / what role", so permissions stay in one place.
 * In demo mode, `switchTo` lets a presenter jump between people to show each role.
 */
export type Me = User & { phone: string | null };

interface Session {
  user: Me | null;
  users: User[];
  role: Role | null;
  loading: boolean;
  demo: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTo: (id: number) => Promise<void>;
  /** Re-read the signed-in person (after editing the profile). */
  reload: () => Promise<void>;
  /** Bumped whenever something other than the current page changed data (reaction, new post, ...). */
  version: number;
  refresh: () => void;
}

const noop = async () => undefined;
const Ctx = createContext<Session>({ user: null, users: [], role: null, loading: true, demo: false, login: noop, logout: noop, switchTo: noop, reload: noop, version: 0, refresh: () => undefined });
export const useSession = () => useContext(Ctx);

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.json ? { "Content-Type": "application/json" } : undefined,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    const me = await api<{ user: Me | null; demo: boolean }>("/api/auth/me").catch(() => ({ user: null, demo: false }));
    setUser(me.user);
    setDemo(me.demo);
    if (me.user) setUsers((await api<{ users: User[] }>("/api/users").catch(() => ({ users: [] }))).users);
    else setUsers([]);
  }, []);

  useEffect(() => { reload().finally(() => setLoading(false)); }, [reload]);

  const login = useCallback(async (email: string, password: string) => {
    await api("/api/auth/login", { method: "POST", json: { email, password } });
    await reload();
  }, [reload]);
  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // a full page load clears every bit of the previous person's state, and lands on the public home page
    window.location.assign("/");
  }, []);
  const switchTo = useCallback(async (id: number) => {
    await api("/api/auth/switch", { method: "POST", json: { userId: id } });
    await reload();
    setVersion((v) => v + 1);
  }, [reload]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ user, users, role: user?.role ?? null, loading, demo, login, logout, switchTo, reload, version, refresh }), [user, users, loading, demo, login, logout, switchTo, reload, version, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
