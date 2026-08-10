// 관리자 인증 — 서버(서버 컴포넌트 / Route Handler)에서만 사용.
// 쿠키 세션에서 로그인 이메일을 읽고 ADMIN_EMAILS 화이트리스트와 대조한다.
// 쿠키 세션 읽기 패턴은 auth/callback/route.ts 와 동일(@supabase/ssr createServerClient).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 화이트리스트: ADMIN_EMAILS="a@x.com,b@y.com" (콤마 구분, 대소문자/공백 무시)
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

// 현재 로그인 유저의 이메일을 서버에서 반환(비로그인/미설정이면 null).
export async function getSessionEmail(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // 서버 컴포넌트 렌더 중엔 쿠키 쓰기가 불가할 수 있음 — 토큰 갱신은 미들웨어가 담당하므로 무시.
      setAll() {},
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

// 관리자면 이메일 반환, 아니면 null. 라우트/페이지 게이팅에 사용.
export async function requireAdmin(): Promise<string | null> {
  const email = await getSessionEmail();
  return isAdminEmail(email) ? email : null;
}
