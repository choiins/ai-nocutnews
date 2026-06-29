import { createClient } from "@supabase/supabase-js";

// env 키가 둘 다 있을 때만 Supabase 사용. 없으면 data.ts가 목업으로 폴백.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// 서버 컴포넌트에서 공개 데이터 조회용 (anon 키 + RLS 공개 read 정책)
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}
