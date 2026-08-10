import { redirect } from "next/navigation";
import type { Article } from "@shared/types";
import { requireAdmin } from "@/lib/admin";
import { getServiceSupabase } from "@/lib/supabaseAdmin";
import AdminList from "./AdminList";

// 관리자 페이지는 항상 최신 상태로 — 캐시/정적화 금지.
export const dynamic = "force-dynamic";

// Short 요약 기사 관리 — 요약 수정 · 톱 배치 · 삭제.
// 접근: ADMIN_EMAILS 화이트리스트에 든 로그인 이메일만(그 외 /me 로 리다이렉트).
export default async function AdminPage() {
  const email = await requireAdmin();
  if (!email) redirect("/me");

  // service_role 로 hidden/draft 포함 전체 기사 조회(공개 read 는 published 만 보임).
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("articles")
    .select("*")
    // 관리 편의: pick(is_featured) 기사를 목록 맨 위로 모아 해제하기 쉽게. 그 안에선 최신순.
    // (공개 피드 순서엔 영향 없음 — 홈은 lib/data.ts 를 통해 별도 정렬)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="admin">
        <p className="admin-error">기사 조회 실패: {error.message}</p>
      </main>
    );
  }

  return <AdminList articles={(data as Article[]) ?? []} adminEmail={email} />;
}
