"use client";
// 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
// @supabase/ssr 의 createBrowserClient 는 세션을 쿠키에 저장해 미들웨어/서버에서도 읽을 수 있다.
// 로그인·좋아요·관심사 등 사용자별 read/write 는 모두 이 클라이언트를 통한다.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase";

let client: SupabaseClient | null = null;

// Supabase 미설정(키 없음)이면 null — 호출부는 localStorage 폴백을 쓴다.
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
