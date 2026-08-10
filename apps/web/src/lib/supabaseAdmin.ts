import { createClient } from "@supabase/supabase-js";

// 관리자 쓰기 전용 Supabase 클라이언트 — service_role 키로 RLS를 우회한다.
// articles 테이블엔 쓰기 RLS 정책이 없으므로(0001은 공개 read만) 수정/삭제는 이 클라이언트로만 가능.
// ⚠️ service_role 키는 절대 브라우저에 노출 금지.
//    이 파일은 서버 컴포넌트/Route Handler에서만 import 한다("use client" 파일에서 절대 import 금지).
//    SUPABASE_SERVICE_ROLE_KEY 는 NEXT_PUBLIC_ 접두사가 없어 client 번들에 포함되지 않는다.
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 관리자 클라이언트 미설정 — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
