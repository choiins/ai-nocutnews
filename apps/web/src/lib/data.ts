// 데이터 접근 레이어 — env 키가 있으면 Supabase, 없으면 목업으로 폴백.
// 페이지(서버 컴포넌트)는 이 모듈만 호출하고 데이터 출처를 신경 쓰지 않는다.
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { MOCK_ARTICLES, MOCK_VIDEOS } from "./fixtures";
import type { Article, YoutubeVideo } from "@shared/types";

let noticed = false;
function noticeMock() {
  if (!noticed) {
    console.info("[dev] 목업 데이터 사용 — Supabase 미설정 (.env.local에 키 입력 시 실데이터 전환)");
    noticed = true;
  }
}

export async function getArticles(limit = 30): Promise<Article[]> {
  if (!isSupabaseConfigured()) {
    noticeMock();
    return MOCK_ARTICLES.slice(0, limit);
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("기사 조회 실패:", error.message);
    return [];
  }
  return (data as Article[]) ?? [];
}

export async function getArticleById(id: string): Promise<Article | null> {
  if (!isSupabaseConfigured()) {
    noticeMock();
    return MOCK_ARTICLES.find((a) => String(a.id) === String(id)) ?? null;
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (error) {
    console.error("기사 상세 조회 실패:", error.message);
    return null;
  }
  return data as Article;
}

// 좋아요한 기사 일괄 조회 (published만). 최신 발행순 정렬.
export async function getArticlesByIds(ids: number[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const byDate = (a: Article, b: Article) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime();

  if (!isSupabaseConfigured()) {
    noticeMock();
    const want = new Set(ids);
    return MOCK_ARTICLES.filter((a) => want.has(a.id)).sort(byDate);
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("articles")
    .select("*")
    .in("id", ids)
    .eq("status", "published");
  if (error) {
    console.error("좋아요 기사 조회 실패:", error.message);
    return [];
  }
  return ((data as Article[]) ?? []).sort(byDate);
}

export async function getVideos(limit = 24): Promise<YoutubeVideo[]> {
  if (!isSupabaseConfigured()) {
    noticeMock();
    return MOCK_VIDEOS.slice(0, limit);
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("youtube_videos")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Watch 조회 실패:", error.message);
    return [];
  }
  return (data as YoutubeVideo[]) ?? [];
}
