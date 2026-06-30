// 관심사 토픽 조회 + 규칙 기반 v1 맞춤 피드 랭킹.
// data.ts와 동일하게 env 키가 있으면 Supabase(topics/article_topics), 없으면 목업으로 폴백.
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { getBrowserSupabase } from "./supabaseClient";
import { MOCK_ARTICLES, MOCK_TOPICS } from "./fixtures";
import type { Article, Topic, TopicType } from "@shared/types";

export interface FeedItem {
  article: Article;
  matched: string[]; // 매칭된 토픽 표시명
  score: number;
}

let noticed = false;
function noticeMock() {
  if (!noticed) {
    console.info("[dev] 목업 토픽 사용 — Supabase 미설정");
    noticed = true;
  }
}

// ---------- 토픽 조회 ----------
export async function getTopics(
  opts: { type?: TopicType; q?: string; trending?: boolean; limit?: number } = {},
): Promise<Topic[]> {
  if (!isSupabaseConfigured()) {
    noticeMock();
    let list = MOCK_TOPICS.slice();
    if (opts.q) {
      const q = opts.q.trim().toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q));
    } else if (opts.type) {
      list = list.filter((t) => t.type === opts.type);
    }
    list.sort((a, b) => (b.mention_count ?? 0) - (a.mention_count ?? 0));
    return list.slice(0, opts.limit ?? 60);
  }

  const sb = getSupabase();
  let query = sb.from("topics").select("slug,name,type,mention_count");
  if (opts.q) {
    const q = opts.q.trim();
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  } else if (opts.type) {
    query = query.eq("type", opts.type);
  }
  const { data, error } = await query
    .order("mention_count", { ascending: false })
    .limit(opts.limit ?? 60);
  if (error) {
    console.error("토픽 조회 실패:", error.message);
    return [];
  }
  return (data as Topic[]) ?? [];
}

// 비로그인 샘플/추천 관심사 — DB 트렌딩(mention_count 상위)
export async function getTrendingSampleTopics(limit = 12): Promise<Topic[]> {
  return getTopics({ trending: true, limit });
}

export async function getTopicsBySlugs(slugs: string[]): Promise<Topic[]> {
  if (slugs.length === 0) return [];
  const order = new Map(slugs.map((s, i) => [s, i]));
  const sortByInput = (list: Topic[]) =>
    list.filter((t) => order.has(t.slug)).sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);

  if (!isSupabaseConfigured()) {
    noticeMock();
    return sortByInput(MOCK_TOPICS.slice());
  }
  const sb = getSupabase();
  const { data, error } = await sb
    .from("topics")
    .select("slug,name,type,mention_count")
    .in("slug", slugs);
  if (error) {
    console.error("토픽 조회 실패:", error.message);
    return [];
  }
  return sortByInput((data as Topic[]) ?? []);
}

// ---------- 사용자 관심사(user_topics) — 로그인 시 DB ----------
// 모두 브라우저 클라이언트(세션 포함)로 동작. 미설정/비로그인 시 빈 처리.
export async function getUserTopicSlugs(): Promise<string[]> {
  const sb = getBrowserSupabase();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("user_topics")
    .select("topics!inner(slug)")
    .eq("user_id", user.id);
  if (error) {
    console.error("관심사 조회 실패:", error.message);
    return [];
  }
  return (data as unknown as { topics: { slug: string } }[] ?? []).map((r) => r.topics.slug);
}

async function topicIdBySlug(slug: string): Promise<number | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data } = await sb.from("topics").select("id").eq("slug", slug).single();
  return (data as { id: number } | null)?.id ?? null;
}

export async function addUserTopicBySlug(slug: string): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const topicId = await topicIdBySlug(slug);
  if (topicId == null) return;
  await sb.from("user_topics").upsert({ user_id: user.id, topic_id: topicId });
}

export async function removeUserTopicBySlug(slug: string): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const topicId = await topicIdBySlug(slug);
  if (topicId == null) return;
  await sb.from("user_topics").delete().eq("user_id", user.id).eq("topic_id", topicId);
}

// ---------- 규칙 기반 v1 랭킹 ----------
const W_MATCH = 5; //  매칭 토픽 수 가중
const W_RELEVANCE = 1; // 토픽 인기(빈도) 합 가중
const HALF_LIFE_H = 24; // 최신성 반감기(시간)
const MAX_MENTION = 25; // mention_count 정규화 기준

function scoreItem(article: Article, matched: string[], weight: number): FeedItem {
  const ageH = Math.max(0, (Date.now() - new Date(article.published_at).getTime()) / 3_600_000);
  const recency = Math.pow(0.5, ageH / HALF_LIFE_H); // 0~1
  const score = recency + W_MATCH * matched.length + W_RELEVANCE * weight;
  return { article, matched, score };
}

interface JoinRow {
  topics: { slug: string; name: string; mention_count: number | null };
  articles: Article;
}

export async function getPersonalizedFeed(slugs: string[], limit = 30): Promise<FeedItem[]> {
  if (slugs.length === 0) return [];

  if (!isSupabaseConfigured()) {
    noticeMock();
    const want = new Set(slugs);
    const nameOf = (slug: string) => MOCK_TOPICS.find((t) => t.slug === slug)?.name ?? slug;
    const weightOf = (slug: string) =>
      (MOCK_TOPICS.find((t) => t.slug === slug)?.mention_count ?? 0) / MAX_MENTION;
    const items: FeedItem[] = [];
    for (const a of MOCK_ARTICLES) {
      const hit = (a.keywords ?? []).filter((k) => want.has(k));
      if (hit.length === 0) continue;
      const weight = hit.reduce((s, k) => s + weightOf(k), 0);
      items.push(scoreItem(a, hit.map(nameOf), weight));
    }
    items.sort((x, y) => y.score - x.score);
    return items.slice(0, limit);
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("article_topics")
    .select("topics!inner(slug,name,mention_count), articles!inner(*)")
    .in("topics.slug", slugs)
    .eq("articles.status", "published");
  if (error) {
    console.error("맞춤 피드 조회 실패:", error.message);
    return [];
  }

  // 기사 단위로 매칭 토픽명/가중치 집계
  const acc = new Map<number, { article: Article; names: string[]; weight: number }>();
  for (const r of (data as unknown as JoinRow[]) ?? []) {
    const a = r.articles;
    const t = r.topics;
    let e = acc.get(a.id);
    if (!e) {
      e = { article: a, names: [], weight: 0 };
      acc.set(a.id, e);
    }
    if (!e.names.includes(t.name)) {
      e.names.push(t.name);
      e.weight += (t.mention_count ?? 0) / MAX_MENTION;
    }
  }

  const items = [...acc.values()].map((e) => scoreItem(e.article, e.names, e.weight));
  items.sort((x, y) => y.score - x.score);
  return items.slice(0, limit);
}

// ---------- 좋아요 기사 → 토픽 → 관련 기사 ----------
// 좋아요한 기사들이 단 토픽 slug 모음.
export async function getTopicSlugsForArticles(articleIds: number[]): Promise<string[]> {
  if (articleIds.length === 0) return [];

  if (!isSupabaseConfigured()) {
    noticeMock();
    const set = new Set<string>();
    for (const a of MOCK_ARTICLES) {
      if (articleIds.includes(a.id)) (a.keywords ?? []).forEach((k) => set.add(k));
    }
    return [...set];
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("article_topics")
    .select("topics!inner(slug)")
    .in("article_id", articleIds);
  if (error) {
    console.error("토픽 매핑 조회 실패:", error.message);
    return [];
  }
  return [...new Set((data as unknown as { topics: { slug: string } }[] ?? []).map((r) => r.topics.slug))];
}

// 좋아요한 기사들의 토픽을 공유하는 다른 기사(좋아요한 것 자체는 제외).
export async function getRelatedArticles(likedIds: number[], limit = 20): Promise<FeedItem[]> {
  if (likedIds.length === 0) return [];
  const slugs = await getTopicSlugsForArticles(likedIds);
  if (slugs.length === 0) return [];
  const feed = await getPersonalizedFeed(slugs, limit + likedIds.length);
  return feed.filter((f) => !likedIds.includes(f.article.id)).slice(0, limit);
}
