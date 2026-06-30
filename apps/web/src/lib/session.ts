"use client";
// 로그인/관심사 클라이언트 훅.
// Supabase 키가 있으면 실제 Supabase Auth(구글 OAuth) + DB(user_topics).
// 키가 없으면(로컬 개발) localStorage 목업(게스트)으로 폴백 — 동일 인터페이스 유지.
import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabaseClient";
import { getUserTopicSlugs, addUserTopicBySlug, removeUserTopicBySlug } from "./topics";

const LOGIN_KEY = "nocut.loggedIn"; // 목업 폴백(키 미설정)용
const INTERESTS_KEY = "nocut.interests";

// 목업 모드에서 쓰는 가짜 유저
const MOCK_USER = { id: "mock-user", email: "guest@local" } as unknown as User;

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const sb = getBrowserSupabase();

  useEffect(() => {
    // ----- 목업: Supabase 미설정 -----
    if (!sb) {
      setUser(localStorage.getItem(LOGIN_KEY) === "1" ? MOCK_USER : null);
      setReady(true);
      return;
    }
    // ----- 실제 Supabase Auth -----
    let alive = true;
    sb.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  // 구글 OAuth 로그인. 성공 시 브라우저가 구글로 리다이렉트되고,
  // 돌아오면 /auth/callback 라우트가 code→세션 교환 후 next 경로로 보낸다.
  const signInWithGoogle = useCallback(async () => {
    if (!sb) {
      // 목업(키 미설정): 즉시 게스트 로그인
      localStorage.setItem(LOGIN_KEY, "1");
      setUser(MOCK_USER);
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/me` },
    });
    if (error) throw error;
    // 이 줄 이후엔 리다이렉트로 실행되지 않음.
  }, [sb]);

  const signOut = useCallback(async () => {
    if (!sb) {
      localStorage.removeItem(LOGIN_KEY);
      setUser(null);
      return;
    }
    await sb.auth.signOut();
    setUser(null);
  }, [sb]);

  return { user, isLoggedIn: !!user, ready, signInWithGoogle, signOut };
}

export function useInterests() {
  const { isLoggedIn, ready: sessionReady } = useSession();
  const sb = getBrowserSupabase();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const useDb = !!sb && isLoggedIn;

  useEffect(() => {
    if (!sessionReady) return;
    let alive = true;
    if (useDb) {
      getUserTopicSlugs().then((s) => {
        if (alive) {
          setSlugs(s);
          setReady(true);
        }
      });
    } else {
      try {
        setSlugs(JSON.parse(localStorage.getItem(INTERESTS_KEY) || "[]"));
      } catch {
        setSlugs([]);
      }
      setReady(true);
    }
    return () => { alive = false; };
  }, [useDb, sessionReady]);

  const persistLocal = (next: string[]) =>
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(next));

  const add = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      if (useDb) addUserTopicBySlug(slug).catch((e) => console.error(e));
      else persistLocal(next);
      return next;
    });
  }, [useDb]);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.filter((s) => s !== slug);
      if (useDb) removeUserTopicBySlug(slug).catch((e) => console.error(e));
      else persistLocal(next);
      return next;
    });
  }, [useDb]);

  return { slugs, add, remove, ready };
}
