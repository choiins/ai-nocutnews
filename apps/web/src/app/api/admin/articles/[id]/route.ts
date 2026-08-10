import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getServiceSupabase } from "@/lib/supabaseAdmin";

// 관리자 쓰기 API — 요약 수정(PATCH) · 삭제(DELETE).
// 모든 메서드는 진입 시 requireAdmin() 으로 이메일을 재검증한다(클라이언트 입력 불신).

// 허용 필드만 골라 update 페이로드로 정규화. 그 외 필드는 무시.
function pickUpdates(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  if ("ai_headline" in body) {
    const v = body.ai_headline;
    out.ai_headline = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  if ("summary_short" in body) {
    const v = body.summary_short;
    out.summary_short = typeof v === "string" && v.trim() ? v : null;
  }
  if ("summary_bullets" in body) {
    // 문자열 배열로 정규화(빈 줄 제거). 없으면 null.
    const raw = body.summary_bullets;
    const arr = Array.isArray(raw)
      ? raw.map((s) => String(s).trim()).filter(Boolean)
      : [];
    out.summary_bullets = arr.length ? arr : null;
  }
  if ("is_featured" in body) {
    out.is_featured = Boolean(body.is_featured);
  }
  if ("status" in body) {
    const allowed = ["published", "draft", "scheduled", "hidden"];
    if (typeof body.status === "string" && allowed.includes(body.status)) {
      out.status = body.status;
    }
  }
  return out;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const updates = pickUpdates(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("articles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ article: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { error } = await sb.from("articles").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
