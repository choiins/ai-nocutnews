"use client";
// 좋아요(Like) 클라이언트 훅.
// 로그인 시 article_likes 테이블이 진실원천(기기 간 동기화).
// 비로그인/Supabase 미설정 시 localStorage 폴백.
// 비로그인 때 쌓인 로컬 좋아요는 로그인 시 1회 DB로 병합한다.
import { useEffect, useState, useCallback } from "react";
import { getBrowserSupabase } from "./supabaseClient";
import { useSession } from "./session";

const LIKED_KEY = "nocut.liked"; // number[]
const LEGACY_KEY = "liked";      // 구형 DesktopReader 포맷 {id:true}

function readLocal(): number[] {
  try {
    const raw = localStorage.getItem(LIKED_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map(Number);
    // 구형 {id:true} → number[]
    return Object.entries(v).filter(([, on]) => on).map(([k]) => Number(k));
  } catch {
    return [];
  }
}
function writeLocal(next: number[]) {
  localStorage.setItem(LIKED_KEY, JSON.stringify(next));
}

export function useLikes() {
  const { user, isLoggedIn, ready: sessionReady } = useSession();
  const sb = getBrowserSupabase();
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  const useDb = !!sb && isLoggedIn && !!user;

  useEffect(() => {
    if (!sessionReady) return;
    let alive = true;
    (async () => {
      if (useDb) {
        const local = readLocal();
        const { data } = await sb!
          .from("article_likes")
          .select("article_id")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false });
        let dbIds = (data as { article_id: number }[] ?? []).map((r) => Number(r.article_id));
        // 로컬에만 있던 좋아요 → DB 병합 (최초 로그인 시)
        const toMigrate = local.filter((id) => !dbIds.includes(id));
        if (toMigrate.length) {
          await sb!.from("article_likes").upsert(
            toMigrate.map((article_id) => ({ user_id: user!.id, article_id })),
          );
          dbIds = [...new Set([...toMigrate, ...dbIds])];
          localStorage.removeItem(LIKED_KEY);
          localStorage.removeItem(LEGACY_KEY);
        }
        if (alive) {
          setIds(dbIds);
          setReady(true);
        }
      } else {
        if (alive) {
          setIds(readLocal());
          setReady(true);
        }
      }
    })();
    return () => { alive = false; };
  }, [useDb, sessionReady, sb, user]);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [id, ...prev];
      if (useDb) {
        if (on) {
          sb!.from("article_likes").delete()
            .eq("user_id", user!.id).eq("article_id", id)
            .then(({ error }) => error && console.error(error.message));
        } else {
          sb!.from("article_likes").upsert({ user_id: user!.id, article_id: id })
            .then(({ error }) => error && console.error(error.message));
        }
      } else {
        writeLocal(next);
      }
      return next;
    });
  }, [useDb, sb, user]);

  return { ids, has, toggle, ready };
}
