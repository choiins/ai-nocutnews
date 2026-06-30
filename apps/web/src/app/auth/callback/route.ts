// 구글 OAuth 콜백 — 구글이 ?code=... 로 되돌려보내면
// 그 code 를 Supabase 세션(쿠키)으로 교환하고 next 경로로 리다이렉트한다.
// @supabase/ssr 의 createServerClient 로 쿠키를 직접 set 해 서버/미들웨어가 세션을 읽게 한다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && url && key) {
    const cookieStore = cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // 실패 시 로그인 화면으로 (에러 표시용 쿼리 포함)
  return NextResponse.redirect(`${origin}/me?error=auth`);
}
