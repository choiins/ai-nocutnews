// Supabase 세션 쿠키 갱신 미들웨어.
// 클라이언트가 만든 auth 쿠키(만료 임박 토큰)를 매 요청마다 새로고침해
// 서버 컴포넌트/라우트에서도 동일 세션을 읽을 수 있게 한다.
// Supabase 미설정(키 없음)이면 그대로 통과.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() 호출이 토큰 갱신을 트리거한다.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // 정적 자산·이미지 제외한 모든 경로
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
