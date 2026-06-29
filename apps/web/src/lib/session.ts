"use client";
// 실 Supabase Auth 전까지 localStorage로 로그인/관심사를 대체.
// 추후: login→Supabase Auth, 관심사 slugs→user_topics 테이블로 교체(동일 인터페이스 유지).
import { useEffect, useState, useCallback } from "react";

const LOGIN_KEY = "nocut.loggedIn";
const INTERESTS_KEY = "nocut.interests";

export function useSession() {
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLoggedIn(localStorage.getItem(LOGIN_KEY) === "1");
    setReady(true);
  }, []);

  const login = useCallback(() => {
    localStorage.setItem(LOGIN_KEY, "1");
    setLoggedIn(true);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem(LOGIN_KEY);
    setLoggedIn(false);
  }, []);

  return { isLoggedIn, ready, login, logout };
}

export function useInterests() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSlugs(JSON.parse(localStorage.getItem(INTERESTS_KEY) || "[]"));
    } catch {
      setSlugs([]);
    }
  }, []);

  const save = (next: string[]) => {
    setSlugs(next);
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(next));
  };

  const add = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.filter((s) => s !== slug);
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { slugs, add, remove, save };
}
